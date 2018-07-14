/*
 * Copyright (c) 2014-2017 Cesanta Software Limited
 * All rights reserved
 *
 * This example demonstrates how to use mJS DHT library API
 * to get data from DHTxx temperature and humidity sensors.
 */

// Load Mongoose OS API
load('api_timer.js');
load('api_dht.js');
load('api_math.js');
load('api_gpio.js');
load('api_mqtt.js');
load('api_sys.js');
load('api_config.js');
load('api_http.js');
load('api_esp8266.js');
load('api_ds3231.js');

let DS3231_I2C_addresss = 0x68 ; 

// Initialize DS3231 library
let myds = DS3231.create(DS3231_I2C_addresss);

// GPIO pin which has a DHT sensor data wire connected
let pin = 4;
let myresults;
Wifi.scan(function(results) { 
    if (results === undefined) {
      print('!! Scan error');
      return;
    }
    print("Number of Wifi:",results.length);
    myresults=results;
    print(JSON.stringify(myresults));
});
// Initialize DHT library
let dht = DHT.create(pin, DHT.DHT11);
let lat = 0;
let lng = 0;
print("Here:");

Timer.set(25000 /* milliseconds */, Timer.REPEAT, function() {
  let t = dht.getTemp();
  let h = dht.getHumidity();
  
  if (isNaN(h) || isNaN(t)) {
    print('Failed to read data from sensor');
    return;
  }
  let topic = 'ESP8266_24';
  let times = getIsoDate();
  HTTP.query({
    url: 'https://geolocationapi',
    data: myresults,      // Optional. If set, JSON-encoded and POST-ed
    success: function(body, full_http_msg) {
      print(body);
      let loc=JSON.parse(body);
      let message = JSON.stringify({
        version : 2,
        id:"ESP8266_24",
        name: "Temp monitoring", 
        group: "FEZ 24",
        type: "temperature",
        sensors: [
          {
            id:0,
            name:"temperature 0",
            type:"temperature"
          },
          {
            id:1,
            name:"humidity 1",
            type:"humidity"
          }
          ],
        description: "An Esp8266 sensor that monitor temperature and humidity",
        location: "Googlelosa",
        latitude:  loc.location!==undefined?loc.location.lat:45.06,
        longitude: loc.location!==undefined?loc.location.lng:7.65,
        internal: true
      });
      let ok = MQTT.pub('cfg', message, 0);
      print('Published:', ok ? 'yes' : 'no', 'topic:cfg', 'message:', message);
    },
    error: function(err) { print(err); },  // Optional
  });
  let message = JSON.stringify(
    {
      version: 2,
      device_id:"ESP8266_24",
      iso_timestamp : times,
      measurements : [ 
          {
            iso_timestamp : times,
            value: t,
            sensor_id: 0,
            status: "OK"
          },
          {
            iso_timestamp : times,
            value: h,
            sensor_id: 1,
            status: "OK"
          }
        ]
    }
  );
  let ok = MQTT.pub(topic, message, 0);
  print('Published:', ok ? 'yes' : 'no', 'topic:', topic, 'message:', message);
  print('Temperature:', t, '*C');
  print('Humidity:', h, '%');
  if(ok){
    print('Going to deepsleep');
    Timer.set(15000,0,function(){
      if(ESP8266.deepSleep(2 * 60 * 1000000)===false){
        print('Error, i just wait the same time');
        Sys.usleep(2*60*1000000);
      }
    },null);
  }
},null);
function getIsoDate(){
  return "20"+toStrN(myds.getTimeYear())+"-"+toStrN(myds.getTimeMonth())+"-"+toStrN(myds.getTimeDate())+"T"+toStrN(myds.getTimeHours())+":"+toStrN(myds.getTimeMinutes())+":"+toStrN(myds.getTimeSeconds())+"+02:00";
}
function toStrN(num){
  let prepose=num<10?"0":"";
  return prepose+JSON.stringify(num);
}