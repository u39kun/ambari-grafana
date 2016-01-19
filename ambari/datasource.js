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

          var emptyData = function (metric) {
            return {
              data: {
                target: metric,
                datapoints: []
              }
            }
          }

          var self = this;

          var getMetricsData = function(target, service) {
            return function(res) {
              console.log('processing metric ' + target.metric);
              if (!res.metrics) {
                return $q.when(emptyData(target.metric));
              }
              var series = [];
              var metricData = res;
              var metricPath = target.metric.split('/');
              if (target.hosts == undefined || target.hosts.trim() == "") {
                metricPath[metricPath.length - 1] += "._" + target.aggregator;
              }
              try {
                for (var path in metricPath) {
                  metricData = metricData[metricPath[path]];
                }
              } catch (ex) {
                console.log('data does not exist in API result.  returning empty data.')
                // return empty data if the data doesn't exist
                return $q.when(emptyData(target.metric));
              }
              var timeSeries = {};
              if (target.hosts === undefined || target.hosts.trim() == "") {
                timeSeries = {
                  target: target.metric,
                  datapoints: []
                };
              } else {
                timeSeries = {
                  target: target.metric + ' on ' + target.hosts,
                  datapoints: []
                };
              }
              for (var i in metricData) {
                var item = metricData[i];
                timeSeries.datapoints[i] = [item[0], item[1] * 1000];
              }
              series.push(timeSeries);
              return $q.when({data: series});
            }
          }

          var getHostComponentData = function(target, service, timeRange) {
            var fields = target.metric + timeRange;
            return backendSrv.get(self.url + '/api/v1/clusters/' + self.clusterName + '/hosts/' + target.hosts + '/host_components/'
                + target.component + '?fields=' + fields).then(
                getMetricsData(target, service)
            );
          }

          var getServiceComponentData = function(target, service, timeRange) {
            var fields = target.metric + "._" + target.aggregator + timeRange;
            return backendSrv.get(self.url + '/api/v1/clusters/' + self.clusterName + '/services/' + service + '/components/'
                + target.component + '?' + 'fields=' + fields).then(
                getMetricsData(target, service)
            );
          }

          var from = Math.floor(options.range.from.valueOf() / 1000);
          var to = Math.floor(options.range.to.valueOf() / 1000);
          var timeRange = '[' + from + ',' + to + ',15]';

          // if componentToServiceMapping has not initialized yet, return empty data
          if (Object.keys(componentToServiceMapping).length == 0) {
            return $q.when([]);
          }

          var metricsPromises = _.map(options.targets, function(target) {
            console.debug('target component=' + target.component + ',' +
                'target metric=' + target.metric);
            var service = componentToServiceMapping[target.component];
            if (!!target.hosts) {
              return getHostComponentData(target, service, timeRange);
            } else {
              return getServiceComponentData(target, service, timeRange);
            }
          });

          return $q.all(metricsPromises).then(function(metricsDataArray) {
            var data = _.map(metricsDataArray, function(metricsData) {
              return metricsData.data
            })
            var metricsDataResult = {data: _.flatten(data)}
            return $q.when(metricsDataResult)
          });
        };

        /**
         * Ambari Datasource Templating Variables.
         * Work in Progress
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
        var serviceComponentMetricKeyCache = {};
        AmbariDatasource.prototype.suggestMetrics = function (query, component) {
          if (!component) {
            return $q.when([]);
          }
          var service = componentToServiceMapping[component];
          if (!service) {
            return $q.when([]);
          }
          if (serviceComponentMetricKeyCache[component] != null) {
            return $q.when(serviceComponentMetricKeyCache[component]);
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
                serviceComponentMetricKeyCache[component] = keys;
                return $q.when(serviceComponentMetricKeyCache[component]);
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
