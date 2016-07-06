# Snapshot for Kibana / Grafana
Scheduled Report Generation for ElasticSearch Kibana / Grafana!

### Start Docker Instance
> docker build -t parvez/snapshot .  
> docker run -p 49160:8080 -d parvez/snapshot


### Configuration
You can find configuration file \app\config\server.json
- os_type - For selection of phantomjs binary
- type - Supports Kibana & Grafana
- dashboard_url - Should be like this:
  http://{YOUR_KIBANA_HOST}:{YOUR_KIBANA_PORT}/app/kibana#/dashboard/
  http://{YOUR_GRAFANA_HOST}:{YOUR_GRAFANA_PORT}/dashboard/
- dashboards_list_url - Should be like this:
  http://{YOUR_KIBANA_HOST}:{YOUR_KIBANA_PORT}/elasticsearch/.kibana/dashboard/_search?size=100
  http://{YOUR_GRAFANA_HOST}:{YOUR_GRAFANA_PORT}/api/search"
- basic_auth_users - Basic authentication list of users

### License
Developed by Parvez  
Copyright (c) 2016 parvezht@gmail.com  
Licensed under the MIT License http://opensource.org/licenses/MIT  

### Screenshots
1. login

![1. login](https://raw.githubusercontent.com/parvez/snapshot_for_kibana/master/screenshots/1_login.png)


2. generated snapshots

![2. generated snapshots](https://raw.githubusercontent.com/parvez/snapshot_for_kibana/master/screenshots/2_generated_snapshots.png)


3. scheduled list

![3. scheduled list](https://raw.githubusercontent.com/parvez/snapshot_for_kibana/master/screenshots/3_scheduled_list.png)


4. schedule

![4. schedule](https://raw.githubusercontent.com/parvez/snapshot_for_kibana/master/screenshots/4_schedule.png)


5. logs

![5. logs](https://raw.githubusercontent.com/parvez/snapshot_for_kibana/master/screenshots/5_logs.png)


6. Demo

![6. demo 1](https://raw.githubusercontent.com/parvez/snapshot_for_kibana/master/screenshots/6_demo_1.png)

![7. demo 1](https://raw.githubusercontent.com/parvez/snapshot_for_kibana/master/screenshots/7_demo_2.png)

![8. demo 1](https://raw.githubusercontent.com/parvez/snapshot_for_kibana/master/screenshots/8_demo_3.png)

![9. demo 1](https://raw.githubusercontent.com/parvez/snapshot_for_kibana/master/screenshots/9_demo_4.png)



