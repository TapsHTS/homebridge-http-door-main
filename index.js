import axios from 'axios'

class HTTPDoor {
  constructor (log, config, api) {
    this.Service = api.hap.Service
    this.Characteristic = api.hap.Characteristic

    // valid types
    this.types = ['lock', 'garage']

    // config defaults
    const defaults = {
      method: 'GET',
      autoLockTimeout: 5 * 1000,
      type: 'lock'
    }

    this.log = log
    this.config = { ...defaults, ...config }

    // initialize service
    if (this.config.type === 'lock') {
      this.service = new this.Service.LockMechanism(this.config.name)
    } else if (this.config.type === 'garage') {
      this.service = new this.Service.GarageDoorOpener(this.config.name)
    } else {
      throw new Error('Invalid door type given')
    }
  }
  autoLock () {
    if (this.autoLockTimeout) clearTimeout(this.autoLockTimeout)
    this.autoLockTimeout = setTimeout(() => {
      this.log.debug('Auto locking accessory')
      this.updateState(1)
    }, this.config.autoLockTimeout)
  }
  updateState (currentState, targetState = null) {
    if (this.config.type === 'lock') {
      this.service.getCharacteristic(this.Characteristic.LockCurrentState).updateValue(currentState)
      this.service.getCharacteristic(this.Characteristic.LockTargetState).updateValue(targetState === null ? currentState : targetState)
    } else if (this.config.type === 'garage') {
      this.service.getCharacteristic(this.Characteristic.CurrentDoorState).updateValue(currentState)
      this.service.getCharacteristic(this.Characteristic.TargetDoorState).updateValue(targetState === null ? currentState : targetState)
    }
  }
  handleSetState (value, callback) {
    if (this.config.type === 'garage') this.updateState(2, 0)
    return axios({
      method: this.config.method,
      url: this.config.url
    }).then(() => {
      this.log.debug('Unlocking accessory')
      this.updateState(0)
      this.autoLock()
      callback()
    }).catch(err => {
      this.log.warn('HTTP request failed', err.message)
      this.updateState(new Error('HTTP request failed'))
      this.autoLock()
      callback(err)
    })
  }
  getServices () {
    // initialize information service
    this.informationService = new this.Service.AccessoryInformation()
    this.informationService.setCharacteristic(this.Characteristic.Manufacturer, 'eo')

    let characteristic
    if (this.config.type === 'lock') {
      characteristic = this.Characteristic.LockTargetState
    } else if (this.config.type === 'garage') {
      characteristic = this.Characteristic.TargetDoorState
    } else {
      throw new Error('Invalid door type given')
    }

    this.service
      .getCharacteristic(characteristic)
      .on('set', this.handleSetState.bind(this))

    // set initial state
    this.log.debug('Setting initial accessory state')
    this.updateState(1)

    return [this.informationService, this.service]
  }
}

export default function (homebridge) {
  homebridge.registerAccessory('@eymengunay/homebridge-http-door', 'HTTPDoor', HTTPDoor)
}