# ambari-grafana

Install Grafana
---------------

You can install Grafana on any host.  It does not need to be co-located with Ambari Server.  The only requirement is that it has network access to Ambari Server.

Run the following command for CentOS/Red Hat:

```
$ sudo yum install https://grafanarel.s3.amazonaws.com/builds/grafana-2.5.0-1.x86_64.rpm
```

For other OS's, please follow the instructions at: http://docs.grafana.org/installation/

Deploy ambari-grafana
---
```
wget ...
```

Start Grafana
---
```
service grafana-server start
```

Create Ambari Datasource in Grafana UI
---
Access Grafana Web UI at http://grafana-host:3000 and log in as admin / admin.

Create an Ambari datasource for your cluster
---
Note: You can set up multiple Ambari datasources if you wish to visualize multiple Ambari-managed clusters.

Create Metric Graphs using the Ambari datasource
---




