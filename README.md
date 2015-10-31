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

Create Ambari Data Source in Grafana UI
---
Access Grafana Web UI at http://grafana-host:3000 and log in as admin / admin.
Click on *Data Sources* in the left nav and click on *Add New* in the top nav.

* Name: *Choose your own data source name*
* Type: **Ambari**
* Cluster: *This has to exactly match the cluster name in Ambari*
* Default: *Suggested to make this the default data source so when you create new graphs, you don't have to select this Ambari Data Source every time*
* Url: *URL of the Ambari Server, including the port*  E.g., http://1.2.3.4:8080
* Access: **proxy**
* Basic Auth: **Enable**
* User: admin *(or the name of any Ambari user that has read access to the cluster)*
* Password: *password of the Ambari user above*

![Alt text](https://raw.githubusercontent.com/u39kun/ambari-grafana/master/screenshots/adding-ambari-data-source-to-grafana.png "Ading Ambari Data Source to Grafana")

Note: You can set up multiple Ambari Data Sources if you wish to visualize multiple Ambari-managed clusters.

Create a New Dashboard
---
![Alt text](https://raw.githubusercontent.com/u39kun/ambari-grafana/master/screenshots/create-grafana-dashboard.png "Create a new dashboard")

Create a new Graph
---
![Alt text](https://raw.githubusercontent.com/u39kun/ambari-grafana/master/screenshots/create-graph-strip-hover.png "Create a new graph - strip hover")

![Alt text](https://raw.githubusercontent.com/u39kun/ambari-grafana/master/screenshots/create-graph-menu.png "Create a new graph - menu")

![Alt text](https://raw.githubusercontent.com/u39kun/ambari-grafana/master/screenshots/edit-graph.png "Create a new graph - edit")






