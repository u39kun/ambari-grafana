define([
  'angular',
],
function (angular) {
  'use strict';

  var module = angular.module('grafana.directives');

  module.directive('metricQueryEditorAmbari', function() {
    return {
      controller: 'AmbariQueryCtrl',
      templateUrl: 'app/plugins/datasource/ambari/partials/query.editor.html',
    };
  });

});
