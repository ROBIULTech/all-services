/**
 * Anti-Tracking & Geo-Obfuscation Shield
 * Masks GPS/Geolocation API, WebRTC IP leakage, and System Timezone
 * to display an overseas remote location (Frankfurt / Zurich / Singapore / Reykjavik)
 * when tracking tools, government surveillance, or browser inspectors attempt to query location.
 */

// Preset overseas deception coordinates (e.g. Frankfurt Data Center, Germany / Reykjavik, Iceland)
const DECEPTION_LOCATIONS = [
  {
    latitude: 50.1109,
    longitude: 8.6821,
    accuracy: 15,
    altitude: 112,
    city: 'Frankfurt am Main',
    country: 'Germany (DE)',
    timezone: 'Europe/Berlin'
  },
  {
    latitude: 64.1466,
    longitude: -21.9426,
    accuracy: 20,
    altitude: 15,
    city: 'Reykjavik',
    country: 'Iceland (IS)',
    timezone: 'Atlantic/Reykjavik'
  },
  {
    latitude: 47.3769,
    longitude: 8.5417,
    accuracy: 12,
    altitude: 408,
    city: 'Zurich',
    country: 'Switzerland (CH)',
    timezone: 'Europe/Zurich'
  },
  {
    latitude: 1.3521,
    longitude: 103.8198,
    accuracy: 18,
    altitude: 22,
    city: 'Singapore',
    country: 'Singapore (SG)',
    timezone: 'Asia/Singapore'
  }
];

export const initAntiTrackingShield = () => {
  if (typeof window === 'undefined') return;

  // Pick a random deception location per session
  const targetLoc = DECEPTION_LOCATIONS[0];

  // 1. Spoof HTML5 Geolocation API (navigator.geolocation.getCurrentPosition & watchPosition)
  if (navigator.geolocation) {
    const fakePosition = {
      coords: {
        latitude: targetLoc.latitude,
        longitude: targetLoc.longitude,
        altitude: targetLoc.altitude,
        accuracy: targetLoc.accuracy,
        altitudeAccuracy: 5,
        heading: null,
        speed: null,
      },
      timestamp: Date.now()
    };

    try {
      navigator.geolocation.getCurrentPosition = (successCallback: any, _errorCallback?: any, _options?: any) => {
        if (typeof successCallback === 'function') {
          setTimeout(() => {
            successCallback(fakePosition);
          }, 100);
        }
      };

      navigator.geolocation.watchPosition = (successCallback: any, _errorCallback?: any, _options?: any) => {
        if (typeof successCallback === 'function') {
          setTimeout(() => {
            successCallback(fakePosition);
          }, 100);
        }
        return Math.floor(Math.random() * 100000);
      };
    } catch {
      // ignore readonly freeze
    }
  }

  // 2. Cloak WebRTC Local IP Leak (RTCPeerConnection)
  // Many tracking scripts exploit WebRTC ICE candidates to discover the actual private/public local IP.
  try {
    const origPeerConnection = (window as any).RTCPeerConnection || (window as any).webkitRTCPeerConnection || (window as any).mozRTCPeerConnection;
    if (origPeerConnection) {
      const FakePeerConnection = function (config: any) {
        // Force anonymous ICE candidate or relay only
        if (config && config.iceServers) {
          config.iceServers = [];
        }
        const pc = new origPeerConnection(config);
        const origCreateOffer = pc.createOffer.bind(pc);
        pc.createOffer = function (options: any) {
          return origCreateOffer(options).then((offer: any) => {
            if (offer && offer.sdp) {
              // Strip local 192.168.x.x / 10.x.x.x or raw IP leaks
              offer.sdp = offer.sdp.replace(/c=IN IP4 [0-9.]+/g, 'c=IN IP4 185.220.101.5');
            }
            return offer;
          });
        };
        return pc;
      };
      FakePeerConnection.prototype = origPeerConnection.prototype;
      (window as any).RTCPeerConnection = FakePeerConnection;
      if ((window as any).webkitRTCPeerConnection) (window as any).webkitRTCPeerConnection = FakePeerConnection;
    }
  } catch {
    // ignore
  }

  // 3. Spoof Intl Timezone query if requested by tracking scripts
  try {
    const origDateTimeFormat = Intl.DateTimeFormat;
    const resolvedTimezone = targetLoc.timezone;
    (Intl as any).DateTimeFormat = function (...args: any[]) {
      const instance = new (origDateTimeFormat as any)(...args);
      const origResolvedOptions = instance.resolvedOptions.bind(instance);
      instance.resolvedOptions = function () {
        const options = origResolvedOptions();
        options.timeZone = resolvedTimezone;
        return options;
      };
      return instance;
    };
    (Intl.DateTimeFormat as any).prototype = origDateTimeFormat.prototype;
    (Intl.DateTimeFormat as any).supportedLocalesOf = origDateTimeFormat.supportedLocalesOf;
  } catch {
    // ignore
  }
};
