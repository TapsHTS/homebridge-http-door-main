<p align="center">
  <a href="https://github.com/homebridge/homebridge">
    <img src="https://github.com/homebridge/branding/raw/master/logos/homebridge-wordmark-logo-vertical.png" width="150" />
  </a>
</p>

# Homebridge HTTP Door

> This is a work in progress.

[WIP] A simple homebridge plugin for controlling (stateless) doors via HTTP requests.

## Configuration sample

```
{
    "accessories": [
        {
            "accessory": "HTTPDoor",
            "name": "Building Door",
            "type": "lock",
            "url": "http://example.com/unlock"
        },
        {
            "accessory": "HTTPDoor",
            "name": "Garage Door",
            "type": "garage",
            "url": "http://example.com/unlock"
        }
    ]
}
```