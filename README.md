# ambari-grafana

Use **ambari-grafana** to visualize metrics exposed via Ambari in Grafana.
The following service metrics are supported as of now: HDFS, YARN, HBase, Storm, Kafka, Flume, Accumulo, and Ambari Metrics

*This has been tested with Ambari 2.1.2 + HDP 2.3.*

**ambari-grafana** is licensed under the Apache License, Version 2.0.

![Alt text](https://raw.githubusercontent.com/u39kun/ambari-grafana/master/screenshots/dashboard.png "Ambari Grafana Dashboard")

![Alt text](https://raw.githubusercontent.com/u39kun/ambari-grafana/master/screenshots/select-metric.png "Ambari Grafana Graph Builder")

Install Grafana
---------------

You can install Grafana on any host.  It does not need to be co-located with Ambari Server.  The only requirement is that it has network access to Ambari Server.

Install on CentOS/Red Hat:
```
sudo yum install https://grafanarel.s3.amazonaws.com/builds/grafana-2.5.0-1.x86_64.rpm
```

Install on Ubuntu/Debian:
```
wget https://grafanarel.s3.amazonaws.com/builds/grafana_2.5.0_amd64.deb
sudo apt-get install -y adduser libfontconfig
sudo dpkg -i grafana_2.5.0_amd64.deb
```

Deploy ambari-grafana
---
```
sudo wget https://github.com/u39kun/ambari-grafana/raw/master/dist/ambari-grafana.tgz
sudo tar zxvf ambari-grafana.tgz -C /usr/share/grafana/public/app/plugins/datasource
```

Start Grafana
---
```
sudo service grafana-server start
```

Create Ambari Data Source in Grafana UI
---
Access Grafana Web UI at http://grafana-host:3000 and log in as admin / admin.

Click on *Data Sources* in the left nav and click on *Add New* in the top nav:
![Alt text](https://raw.githubusercontent.com/u39kun/ambari-grafana/master/screenshots/create-data-source.png "Create a new data source")

* Name: *Choose your own data source name*
* Default: *Recommended to make this the default data source so when you create new graphs, you don't have to select this Ambari Data Source every time*
* Type: **Ambari**
* Cluster: *This has to exactly match the cluster name in Ambari*
* Stack: HDP (*or other stack name that is installed on the cluster*)
* Version: 2.3 (*or other stack version that is installed on the cluster*)
* Url: *URL of the Ambari Server, including the port*  E.g., http://1.2.3.4:8080
* Access: **proxy**
* Basic Auth: **Enable**
* User: admin *(or the name of any Ambari user that has read access to the cluster)*
* Password: *password of the Ambari user above*

![Alt text](https://raw.githubusercontent.com/u39kun/ambari-grafana/master/screenshots/adding-ambari-data-source-to-grafana.png "Ading Ambari Data Source to Grafana")

Note: You can set up multiple Ambari Data Sources if you wish to visualize multiple Ambari-managed clusters.

In case you have not used Grafana before...
---
Grafana UI can be a little tricky to get used to.
Here's a walk through of how to create a dashboard and add a graph to it.

Create a New Dashboard
---
![Alt text](https://raw.githubusercontent.com/u39kun/ambari-grafana/master/screenshots/create-grafana-dashboard.png "Create a new dashboard")

Create a new Graph
---
![Alt text](https://raw.githubusercontent.com/u39kun/ambari-grafana/master/screenshots/create-graph-strip-hover.png "Create a new graph - strip hover")

![Alt text](https://raw.githubusercontent.com/u39kun/ambari-grafana/master/screenshots/create-graph-menu.png "Create a new graph - menu")

![Alt text](https://raw.githubusercontent.com/u39kun/ambari-grafana/master/screenshots/edit-graph.png "Create a new graph - edit")

![Alt text](https://raw.githubusercontent.com/u39kun/ambari-grafana/master/screenshots/select-component.png "Create a new graph - select component")

![Alt text](https://raw.githubusercontent.com/u39kun/ambari-grafana/master/screenshots/select-metric.png "Create a new graph - select metric")

![Alt text](https://raw.githubusercontent.com/u39kun/ambari-grafana/master/screenshots/select-unit.png "Create a new graph - select unit")

![Alt text](https://raw.githubusercontent.com/u39kun/ambari-grafana/master/screenshots/set-title.png "Create a new graph - set title")

![Alt text](https://raw.githubusercontent.com/u39kun/ambari-grafana/master/screenshots/save-dashboard.png "Create a new graph - save dashboard")




