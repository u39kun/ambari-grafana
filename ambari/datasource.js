define([
    'angular',
    'lodash',
    'jquery',
    './directives',
    './queryCtrl',
  ],
  function (angular, _) {
    'use strict';

    var module = angular.module('grafana.services');

    module.factory('AmbariDatasource', function ($q, backendSrv, templateSrv) {

      /**
       * Ambari Datasource Constructor
       */
      function AmbariDatasource(datasource) {
        this.name = datasource.name;
        this.url = datasource.url;
        this.clusterName = datasource.jsonData.clusterName;
        this.stackName = datasource.jsonData.stackName;
        this.stackVersion = datasource.jsonData.stackVersion;
        this.initializeComponentMapping();
      }

      /**
       * Ambari Datasource Authentication
       */
      AmbariDatasource.prototype.doAmbariRequest = function (options) {
        if (this.basicAuth || this.withCredentials) {
          options.withCredentials = true;
        }
        if (this.basicAuth) {
          options.headers = options.headers || {};
          options.headers.Authorization = this.basicAuth;
        }

        options.url = this.url + options.url;
        options.inspect = {type: 'ambari'};

        return backendSrv.datasourceRequest(options);
      };
      /**
       * Ambari Datasource - Initialize Component to Service Mapping.
       *
       * Creates an object array map of Component to Service Names.
       */
      var componentToServiceMapping = {};
      var components = {};
      AmbariDatasource.prototype.initializeComponentMapping = function () {
        backendSrv.get(this.url + '/api/v1/stacks/' + this.stackName + '/versions/'
          + this.stackVersion + '/services?artifacts/Artifacts/artifact_name=metrics_descriptor&fields=artifacts/*')
          .then(function (item) {
            _.forEach(item.items, function (getNames) {
              var serviceName = getNames.StackServices.service_name;
              var artifactData = getNames.artifacts[0].artifact_data;
              var res = artifactData && artifactData[serviceName];
              if (!!res) {
                for (var i in artifactData[serviceName]) {
                  componentToServiceMapping[i]  = serviceName;
                }
              }
            });
            components = _.keys(componentToServiceMapping);
          });
      };

      /**
       * Ambari Datasource Query (called once per graph)
       */
      AmbariDatasource.prototype.query = function (options) {
        var from = Math.floor(options.range.from.valueOf() / 1000);
        var to = Math.floor(options.range.to.valueOf() / 1000);
        var timeRange = '[' + from + ',' + to + ',15]';
        var targetsWithMetric = _.filter(options.targets, 'metric');
        var hostInMetric = _.filter(options.targets, 'hosts');
        var fields = _.map(targetsWithMetric, function (target) {
          return target.metric + "._" + target.aggregator + timeRange;
        }).join(',');
        var hostFields = _.map(hostInMetric, function (target) {
          return target.metric + timeRange;
        });
        if (!fields) {
          return $q.when([]);
        }
        var component = targetsWithMetric[0].component;
        var service = componentToServiceMapping[component];

        if (!!options.targets[0].hosts) {
          var host = hostInMetric[0].hosts;
          return backendSrv.get(this.url + '/api/v1/clusters/' + this.clusterName + '/hosts/' + host + '/host_components/'
            + component + '?fields=' + hostFields).then(
            function (res) {
              if (!res.metrics) {
                return $q.when({});
              }
              var series = [];
              _.forEach(hostInMetric, function (target) {
                console.log('processing ' + target.metric);
                var metricData = res;
                var metricPath = target.metric.split('/');
                for (var path in metricPath) {
                  metricData = metricData[metricPath[path]];
                }
                var timeSeries = {
                  target: target.metric,
                  datapoints: []
                };
                for (var i in metricData) {
                  var item = metricData[i];
                  timeSeries.datapoints[i] = [item[0], item[1] * 1000];
                }
                series.push(timeSeries);
              });
              return $q.when({data: series});
            });
        } else {
          return backendSrv.get(this.url + '/api/v1/clusters/' + this.clusterName + '/services/' + service + '/components/'
            + component + '?' + 'fields=' + fields).then(
            function (res) {
              if (!res.metrics) {
                return $q.when({});
              }
              var series = [];
              _.forEach(targetsWithMetric, function (target) {
                console.log('processing ' + target.metric);
                var metricData = res;
                var metricPath = target.metric.split('/');
                metricPath[metricPath.length - 1] += "._" + target.aggregator;
                for (var path in metricPath) {
                  metricData = metricData[metricPath[path]];
                }
                var timeSeries = {
                  target: target.metric,
                  datapoints: []
                };
                for (var i in metricData) {
                  var item = metricData[i];
                  timeSeries.datapoints[i] = [item[0], item[1] * 1000];
                }
                series.push(timeSeries);
              });
              return $q.when({data: series});
            });
        }
      };

      /**
       * Ambari Datasource Templating Variables.
       */
      AmbariDatasource.prototype.metricFindQuery = function (query) {
        var interpolated;
        try {
          interpolated = templateSrv.replace(query);
        } catch (err) {
          return $q.reject(err);
        }
        return this.doAmbariRequest({
            method: 'GET',
            url: '/api/v1/clusters/' + this.clusterName + '/' + interpolated
          })
          .then(function (results) {
            var queryName = interpolated.split('/');
            //split the query by /
            var name = queryName[queryName.length - 1];
            //grab the last element of the split query
            return _.map(results.data.items, function (metric) {
              switch (name) {
                case "hosts":
                  var dname = metric.Hosts.host_name;
                  //iterate through all hosts
                  break;
                case "host_components":
                  dname = metric.HostRoles.component_name;
                  //iterate through all component names
                  break;
                default:
                  dname = metric.metrics;
                  // this won't work because metrics cannot be iterated through .items - needs to be removed..
                  break;
              }
              return {
                text: dname,
                expandable: metric.expandable ? true : false
              };
            });
          });
      };

      /**
       * Ambari Datasource - Test Data Source Connection.
       *
       * Added Check to see if Datasource is working. Throws up an error in the
       * Datasources page if incorrect info is passed on.
       */
      AmbariDatasource.prototype.testDatasource = function () {
        return this.metricFindQuery('hosts').then(function () {
          return {status: "success", message: "Data source is working", title: "Success"};
        });
      };

      /**
       * Ambari Datasource List Series.
       */
      AmbariDatasource.prototype.listSeries = function (query) {
        // wrap in regex
        if (query && query.length > 0 && query[0] !== '/') {
          query = '/' + query + '/';
        }
        return $q.when([]);
      };

      /**
       * Ambari Datasource Suggest Components.
       *
       * Suggest Components and store in cache.
       */
      var componentKeyCache = null;

      AmbariDatasource.prototype.suggestComponents = function (query) {
        console.log(query);
        if (componentKeyCache != null) {
          return $q.when(componentKeyCache);
        }
        componentKeyCache = _.map(components, function (k) {
          return {text: k};
        });
        return $q.when(componentKeyCache);
      };

      /**
       * Ambari Datasource Suggest Hosts
       *
       * Query Hosts of the datasource's cluster and add them to a dropdown
       */
      AmbariDatasource.prototype.suggestHosts = function (query) {
        console.log(query);
        return this.doAmbariRequest({method: 'GET', url: '/api/v1/clusters/' + this.clusterName + '/hosts/'})
          .then(function (results) {
            return _.map(results.data.items, function (metric) {
              var hostsDropdown = metric.Hosts.host_name;
              return {text: hostsDropdown};
            });
          });
      };

      /**
       * Ambari Datasource Suggest Metrics
       *
       * Suggest Metrics based on the component chosen and store in cache.
       */
      var serviceMetricKeyCache = {};
      AmbariDatasource.prototype.suggestMetrics = function (query, component) {
        if (!component) {
          return $q.when([]);
        }
        var service = componentToServiceMapping[component];
        if (!service) {
          return $q.when([]);
        }
        if (serviceMetricKeyCache[service] != null) {
          return $q.when(serviceMetricKeyCache[service]);
        }
        return backendSrv.get(this.url + '/api/v1/stacks/' + this.stackName + '/versions/' + this.stackVersion +
          '/services/' + service + '/artifacts/metrics_descriptor').then(
          function (res) {
            var _metricKeys = res.artifact_data[service][component].Component[0].metrics.default;
            var keys = [];
            for (var metricKey in _metricKeys) {
              if (_metricKeys.hasOwnProperty(metricKey)) {
                keys.push(metricKey);
              }
            }
            keys = _.map(keys, function (k) {
              return {text: k};
            });
            serviceMetricKeyCache[service] = keys;
            return $q.when(serviceMetricKeyCache[service]);
          }
        );
      };

      /**
       * Ambari Datasource Get Aggregators.
       */
      var aggregatorsPromise = null;
      AmbariDatasource.prototype.getAggregators = function () {
        if (aggregatorsPromise) {
          return aggregatorsPromise;
        }
        aggregatorsPromise = $q.when([
          'avg', 'sum', 'min', 'max'
        ]);
        return aggregatorsPromise;
      };

      return AmbariDatasource;
    });
  }
);