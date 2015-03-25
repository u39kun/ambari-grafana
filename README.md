# ambari-grafana
Integrate Grafana with Ambari Metrics System

Development Notes

Install InfluxDB (MacOS)
```
brew update
brew install influxdb
```

Start InfluxDB (MacOS)
```
influxdb -config=/usr/local/etc/influxdb.conf
```

Access InfluxDB web console by hitting http://localhost:8083 from the browser.


Checkout Grafana code
```
npm install -g grunt
git clone https://github.com/grafana/grafana.git
cd grafana
git checkout -b v1.9.1 v1.9.1
```

Run Grafana in development mode
```
npm install
grunt server
```

Load Grafana by hitting http://localhost:5061 from the browser.

Modify Grafana config
```
cp src/config.js.sample src/config.js
vi src/config.js
```

Uncomment InfluxDB example section, and modify the parameters as follows:
```
      datasources: {
        influxdb: {
          type: 'influxdb',
          url: "http://localhost:8086/db/metrics",
          username: 'root',
          password: 'root',
        },
        grafana: {
          type: 'influxdb',
          url: "http://localhost:8086/db/grafana",
          username: 'root',
          password: 'root',
          grafanaDB: true
        },
      },
```

Create the "metrics" and "grafana" databases in InfluxDB
```
curl -X POST 'http://localhost:8086/db?u=root&p=root' -d '{"name": "metrics"}'
curl -X POST 'http://localhost:8086/db?u=root&p=root' -d '{"name": "grafana"}'
```



