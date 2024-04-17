<p align="center">
  <a href="https://github.com/homebridge/homebridge">
    <img src="https://avatars.githubusercontent.com/u/38217527?s=200&v=4" width="150" />
  </a>
</p>

# Homebridge HTTP Various Door

> Simple usage.

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

> Thanks to `eymengunay`
