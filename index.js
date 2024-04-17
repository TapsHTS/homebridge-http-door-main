import axios from 'axios'

class HTTPDoor {
    constructor(log, config, api) {
        this.Service = api.hap.Service
        this.Characteristic = api.hap.Characteristic

        // valid types
        this.types = ['lock', 'garage', 'blinds']

        // config defaults
        const defaults = {
            method: 'GET',
            autoLockTimeout: 5 * 1000,
            type: 'lock'
        }

        this.log = log
        this.config = {...defaults, ...config }

        // initialize service
        if (this.config.type === 'lock') {
            this.service = new this.Service.LockMechanism(this.config.name)
        } else if (this.config.type === 'garage') {
            this.service = new this.Service.GarageDoorOpener(this.config.name)
        } else if (this.config.type === 'blinds') {
            this.service = new this.Service.WindowCovering(this.config.name)
        } else {
            throw new Error('Invalid door type given')
        }
    }
    autoLock() {
        if (this.autoLockTimeout) clearTimeout(this.autoLockTimeout)
        this.autoLockTimeout = setTimeout(() => {
            this.log.debug('Auto locking accessory')
            this.updateState(1)
        }, this.config.autoLockTimeout)
    }
    updateState(currentState, targetState = null) {
        if (this.config.type === 'lock') {
            this.service.getCharacteristic(this.Characteristic.LockCurrentState).updateValue(currentState)
            this.service.getCharacteristic(this.Characteristic.LockTargetState).updateValue(targetState === null ? currentState : targetState)
        } else if (this.config.type === 'garage') {
            this.service.getCharacteristic(this.Characteristic.CurrentDoorState).updateValue(currentState)
            this.service.getCharacteristic(this.Characteristic.TargetDoorState).updateValue(targetState === null ? currentState : targetState)
        } else if (this.config.type === 'blinds') {
            this.service.getCharacteristic(this.Characteristic.CurrentPosition).updateValue(currentState)
            this.service.getCharacteristic(this.Characteristic.TargetPosition).updateValue(targetState === null ? currentState : targetState)
        } else {
            throw new Error('Invalid door type given')
        }
    }
    handleSetState(value, callback) {
        if (this.config.type === 'garage') {
            this.updateState(2, 0)
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
        } else if (this.config.type === 'blinds') {
            let targetState;
            if (value >= 55 && value <= 100) {
                targetState = 0; // Close
            } else if (value >= 0 && value <= 45) {
                targetState = 100; // Open
            } else if (value > 45 && value < 55) {
                targetState = 50; // Pause
                return axios({
                    method: this.config.method,
                    url: this.config.pauseUrl
                }).then(() => {
                    this.log.debug('Pausing accessory')
                    this.updateState(value, targetState)
                    this.autoLock()
                    callback()
                }).catch(err => {
                    this.log.warn('HTTP request failed', err.message)
                    this.updateState(new Error('HTTP request failed'))
                    this.autoLock()
                    callback(err)
                })
            } else {
                this.log.warn('Invalid value for blinds');
                callback(new Error('Invalid value for blinds'));
                return;
            }

            this.updateState(value, targetState);
            return axios({
                method: this.config.method,
                url: this.config.url
            }).then(() => {
                this.log.debug('Setting accessory state to', value);
                this.autoLock();
                callback();
            }).catch(err => {
                this.log.warn('HTTP request failed', err.message);
                this.updateState(new Error('HTTP request failed'));
                this.autoLock();
                callback(err);
            });
        }
    }

    getServices() {
        // initialize information service
        this.informationService = new this.Service.AccessoryInformation()
        this.informationService.setCharacteristic(this.Characteristic.Manufacturer, 'eo')

        let characteristic
        if (this.config.type === 'lock') {
            characteristic = this.Characteristic.LockTargetState
        } else if (this.config.type === 'garage') {
            characteristic = this.Characteristic.TargetDoorState
        } else if (this.config.type === 'blinds') {
            characteristic = this.Characteristic.TargetPosition
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

export default function(homebridge) {
    homebridge.registerAccessory('@tapshts/homebridge-http-door', 'HTTPDoor', HTTPDoor)
}