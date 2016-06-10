# Snapshot for Kibana
Scheduled Report Generation for ElasticSearch Kibana!

### Start Docker Instance
> docker build -t parvez/snapshot_for_kibana .  
> docker run -p 49160:8080 -d parvez/snapshot_for_kibana


### Configuration
You can find configuration file \app\config\server.json
- os_type - For selection of phantomjs binary
- dashboard_url & dashboards_list_url - Kibana URLs
- basic_auth_users - Basic authentication list of users

### License
Developed by Parvez  
Copyright (c) 2016 parvezht@gmail.com  
Licensed under the MIT License http://opensource.org/licenses/MIT  

### Screenshots
1. login
![1. login](https://raw.githubusercontent.com/parvez/snapshot_for_kibana/master/screenshots/1.%20login.png)

2. generated snapshots
![2. generated snapshots](https://raw.githubusercontent.com/parvez/snapshot_for_kibana/master/screenshots/2.%20generated%20snapshots.png)

3. scheduled list
![3. scheduled list](https://raw.githubusercontent.com/parvez/snapshot_for_kibana/master/screenshots/3.%20scheduled%20list.png)

4. schedule
![4. schedule](https://raw.githubusercontent.com/parvez/snapshot_for_kibana/master/screenshots/4.%20schedule.png)

5. logs
![5. logs](https://raw.githubusercontent.com/parvez/snapshot_for_kibana/master/screenshots/5.%20logs.png)

