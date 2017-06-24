var async = require('async'),
    moment = require('moment'),
    util = require('util'),
    request = require('request'),
    i2c = require('i2c-bus').openSync(1);

const API_WEB_HOST = 'http://localhost/';

const I2C_BUFFER_SIZE       = 32

const I2C_NOK               = 0x00
const I2C_OK                = 0x01

const I2C_SET_CHANNEL       = 0x10
const I2C_SET_RSSI_MIN      = 0x11
const I2C_SET_SMARTSENSE    = 0x12
const I2C_SET_MIN_LAP_SECS  = 0x13
const I2C_SET_MAX_LAP_SECS  = 0x14

const I2C_GET_CONFIG        = 0x20

const I2C_START_RACE        = 0x30
const I2C_GET_LAST_LAP      = 0x31


var vtxI2C = function () {
  _self = this;
  console.log("vtxI2C started, I2C ready.");
  _self.vtxTimers = i2c.scanSync();
  // this.intervalScanLapTimes();
};

vtxI2C.prototype._self = null;


vtxI2C.prototype.vtxTimersAlias = {
  0x11: "VTX_1",
  0x12: "VTX_2",
  0x13: "VTX_3",
  0x14: "VTX_4",
  0x15: "VTX_5",
  0x16: "VTX_6",
  0x17: "VTX_7",
  0x18: "VTX_8"
};

vtxI2C.prototype.startRace = function() {
  console.log("vtxI2C startRace");
  async.each(_self.vtxTimers, function(address, callback) {

    var buffer = new Buffer(I2C_BUFFER_SIZE);
    i2c.readI2cBlock(address, I2C_START_RACE, I2C_BUFFER_SIZE, buffer, function(err, bytesRead, bufferResponse) {

        if(err) {
          console.log("err: ", err);
          callback(true);
          return;
        }
        callback();
    });

  }, function(err) {
      // if any of the file processing produced an error, err would equal that error
      if( err ) {
        // One of the iterations produced an error.
        // All processing will now stop.
        console.log('A device send error starting new race');
        this.startRace();
      } else {
        console.log('All I2C devices started new race');
      }
  });  
}

vtxI2C.prototype.stopRace = function() {
  
}

vtxI2C.prototype.startCheckLapTimes = function() {
  
}

vtxI2C.prototype.stopCheckLapTimes = function() {
  
}


vtxI2C.prototype.intervalCheckLapTimes = setInterval(function() {
  _self.vtxTimers = i2c.scanSync();

  // assuming openFiles is an array of file names
  async.each(_self.vtxTimers, function(address, callback) {
    var buffer = new Buffer(I2C_BUFFER_SIZE);
    i2c.readI2cBlock(address, I2C_GET_LAST_LAP, I2C_BUFFER_SIZE, buffer, function(err, bytesRead, bufferResponse) {

        if(err) {
          console.log("err: ", err);
          callback(true);
          return;
        }
        switch(bufferResponse[1]) {

          case I2C_GET_LAST_LAP:

                if(bufferResponse[2] == I2C_OK) {
                  var bufFreq = Buffer.from([bufferResponse[5], bufferResponse[6]]);
                  var bufLapTime = Buffer.from([bufferResponse[7], bufferResponse[8], bufferResponse[9], bufferResponse[10]]);

                  console.log("Timer ID     :  0x%s", bufferResponse[0].toString(16));
                  console.log("Channel idx  : ", bufferResponse[3]);
                  console.log("Channel band : ", bufferResponse[4].toString(16));
                  console.log("Channel freq : ", bufFreq.readUInt16BE(0));
                  console.log("Lap Time     : ", bufLapTime.readUInt32BE(0));
                  console.log("RSSI         : ", bufferResponse[11]);
                  console.log("---------------------------------------");

                  request({
                      url: util.format("%s/api/v1/lap_track/create", API_WEB_HOST), //URL to hit
                      qs: {transponder_token: _self.vtxTimersAlias[address], lap_time_in_ms: bufLapTime.readUInt32BE(0)}, //Query string data
                      method: 'GET'
                  }, function(error, response, body){
                      if(error) {
                          console.log("error ", error);
                      } else {
                          console.log("response.statusCode: ", response.statusCode);
                      }
                  });     

                }
                break;

        }
        callback();
    });

  }, function(err) {
      // if any of the file processing produced an error, err would equal that error
      if( err ) {
        // One of the iterations produced an error.
        // All processing will now stop.
        // console.log('A devices failed to process');
      } else {
        // console.log('All devices have been processed successfully');
      }
  });

}, 100);


module.exports = new vtxI2C();
