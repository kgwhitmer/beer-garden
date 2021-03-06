import angular from 'angular';

queueIndexController.$inject = ['$scope', '$compile', '$window', '$location', '$interval', '$http',
                                'DTOptionsBuilder', 'DTColumnBuilder', 'QueueService'];
export default function queueIndexController($scope, $compile, $window, $location, $interval, $http,
                                             DTOptionsBuilder, DTColumnBuilder, QueueService) {
  $scope.alerts = [];
  $scope.dtInstance = null;

  $scope.setQueueValues = function(){
    $scope.queueHost = $scope.config.amq_host;
    $scope.queuePort = $scope.config.amq_port;
    $scope.queueAdminPort = $scope.config.amq_admin_port;
    $scope.queueVirtualHost = encodeURIComponent($scope.config.amq_virtual_host);
  }

  // Make sure config is loaded before attempting to set scope objects to undefined
  if($scope.config.amq_host == null){
    $scope.$on('configLoaded', function(){
      $scope.setQueueValues();
    });
  }
  else{
    $scope.setQueueValues();
  }

  $scope.queues = {
    data: [],
    loaded: false,
    error: false,
    errorMessage: '',
    status: null,
    errorMap: QueueService.errorMap
  };

  $scope.dtOptions = DTOptionsBuilder
    .fromFnPromise(function() {
      return QueueService.getQueues().then($scope.successCallback, $scope.failureCallback);
    })
    .withBootstrap()
    .withDisplayLength(50)
    .withDataProp('data')
    .withOption('order', [4, 'asc'])
    .withOption('autoWidth', false)
    .withOption('createdRow', function(row, data, dataIndex) {
      $compile(angular.element(row).contents())($scope);
    });

  $scope.dtColumns = [
    DTColumnBuilder
      .newColumn(null)
      .withTitle('')
      .withOption('width', '15px')
      .notSortable()
      .renderWith(function(data, type, full) {
        return '<a ng-href="http://{{queueHost}}:{{queueAdminPort}}/#/queues/{{queueVirtualHost}}/' + full.name + '" target="_blank">' +
          '<i class="fa fa-database fa-fw icon-color"></i>' +
        '</a>';
      }),
    DTColumnBuilder
      .newColumn('system')
      .withTitle('System')
      .renderWith(function(data, type, full) {
        return '<a ui-sref="system({id: \'' + full.system_id + '\'})">' + (full.display || data) + '</a>';
      }),
    DTColumnBuilder
      .newColumn('version')
      .withTitle('Version'),
    DTColumnBuilder
      .newColumn('instance')
      .withTitle('Instance Name'),
    DTColumnBuilder
      .newColumn('name')
      .withTitle('Queue Name'),
    DTColumnBuilder
      .newColumn('size')
      .withTitle('Queued Messages'),
    DTColumnBuilder
      .newColumn(null)
      .withTitle('Actions')
      .withOption('width', '10%')
      .notSortable()
      .renderWith(function(data, type, full) {
        return '<button class="btn btn-danger btn-block word-wrap-button" ng-click="clearQueue(\'' + full.name + '\')">Clear Queue</button>';
      })
  ];

  $scope.instanceCreated = function(_instance) {
    $scope.dtInstance = _instance;
  };

  $scope.clearQueue = function(queueName) {
    QueueService.clearQueue(queueName).then($scope.addSuccessAlert, $scope.addErrorAlert);
  };

  $scope.clearAllQueues = function() {
    QueueService.clearQueues().then($scope.addSuccessAlert, $scope.addErrorAlert);
  };

  $scope.closeAlert = function(index) {
    $scope.alerts.splice(index, 1);
  };

  $scope.addSuccessAlert = function(response) {
    $scope.alerts.push({
      type: "success",
      msg: "Success! Please allow 5 seconds for the message counts to update."
    });
  };

  $scope.addErrorAlert = function(response) {
    var msg = "Uh oh! It looks like there was a problem clearing the queue.\n";
    if(response.data !== undefined && response.data !== null) {
      msg += response.data;
    }
    $scope.alerts.push({
      type: "danger",
      msg: msg
    });
  };

  var poller = $interval(function() {
    if($scope.dtInstance) {
      $scope.dtInstance.reloadData(function() {}, false);
    }
  }, 5000);

  $scope.$on('$destroy', function() {
    if(angular.isDefined(poller)) {
      $interval.cancel(poller);
      poller = undefined;
    }
  });

  $scope.successCallback = function(response) {
    $scope.queues.data = response.data;
    $scope.queues.loaded = true;
    $scope.queues.error = false;
    $scope.queues.status = response.status;
    $scope.queues.errorMessage = '';

    return response.data;
  };

  $scope.failureCallback = function(response) {
    $scope.queues.data = [];
    $scope.queues.loaded = false;
    $scope.queues.error = true;
    $scope.queues.status = response.status;
    $scope.queues.errorMessage = response.data.message;
  };
};
