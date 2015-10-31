define([
    'angular',
    'lodash',
    './directives',
    './queryCtrl',
  ],
  function (angular, _) {
    'use strict';

    var module = angular.module('grafana.services');

    module.factory('AmbariDatasource', function ($q, backendSrv) {

      // TODO: remove hardcoding
      var componentToServiceMapping = {
        'NAMENODE': 'HDFS',
        'DATANODE': 'HDFS',
        'JOURNALNODE': 'HDFS',
        'RESOURCEMANAGER': 'YARN',
        'NODEMANAGER': 'YARN',
        'HBASE_MASTER': 'HBASE',
        'HBASE_REGIONSERVER': 'HBASE',
        'NIMBUS': 'STORM',
        'STORM_UI_SERVER': 'STORM',
        'SUPERVISOR': 'STORM',
        'KAFKA_BROKER': 'KAFKA',
        'FLUME_HANDLER': 'FLUME',
        'ACCUMULO_GC': 'ACCUMULO',
        'ACCUMULO_MASTER': 'ACCUMULO',
        'ACCUMULO_TSERVER': 'ACCUMULO',
        'METRICS_COLLECTOR': 'AMBARI_METRICS'
      };
      var components = _.keys(componentToServiceMapping);

      function AmbariDatasource(datasource) {
        this.name = datasource.name;
        this.url = datasource.url;
        this.clusterName = datasource.jsonData.clusterName;
        this.stackName = datasource.jsonData.stackName;
        this.stackVersion = datasource.jsonData.stackVersion;
      }

      AmbariDatasource.prototype.query = function (options) {
        var from = Math.floor(options.range.from.valueOf() / 1000);
        var to = Math.floor(options.range.to.valueOf() / 1000);
        // var stepInSeconds = (to - from) / options.maxDataPoints;

        var timeRange = '[' + from + ',' + to + ',15]';

        var targetsWithMetric = _.filter(options.targets, 'metric');

        var fields = _.map(targetsWithMetric, function (target) {
          return target.metric + "._" + target.aggregator + timeRange;
        }).join(',');

        if (!fields) {
          return $q.when([]);
        }

        var component = targetsWithMetric[0].component;
        var service = componentToServiceMapping[component];

        return backendSrv.get(this.url +
          '/api/v1/clusters/' + this.clusterName + '/services/' + service + '/components/' + component + '?' +
          'fields=' + fields).then(
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
      };

      AmbariDatasource.prototype.listSeries = function (query) {
        // wrap in regex
        if (query && query.length > 0 && query[0] !== '/') {
          query = '/' + query + '/';
        }

        return $q.when([
        ]);
      };

      var componentKeyCache = null;

      AmbariDatasource.prototype.suggestComponents = function (query) {
        console.log(query);
        if (componentKeyCache != null) {
          return $q.when(componentKeyCache);
        }
        // TODO: Remove hardcoding - retrieve via API
        componentKeyCache = _.map(components, function (k) {
          return { text: k };
        });
        return $q.when(componentKeyCache);
      };

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
            // TODO: remove hardcoding of service and component
            var _metricKeys = res.artifact_data[service][component].Component[0].metrics.default;
            var keys = [];
            for (var metricKey in _metricKeys) {
              if (_metricKeys.hasOwnProperty(metricKey)) {
                keys.push(metricKey);
              }
            }
            keys = _.map(keys, function (k) {
              return { text: k };
            });
            serviceMetricKeyCache[service] = keys;
            return $q.when(serviceMetricKeyCache[service]);
          }
        );
      };

      /*
      AmbariDatasource.prototype.annotationQuery = function (annotation, rangeUnparsed) {
      };
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