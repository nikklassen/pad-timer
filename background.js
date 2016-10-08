(function() {

  const STAMINA_INTERVAL = 3 * 60 * 1000;

  function getStaminaForRank(rank) {
    if (rank > 69) {
      return 51 + Math.floor((rank - 69) / 2);
    } else if (rank > 60) {
      return 48 + Math.floor((rank - 60) / 3);
    } else if (rank === 60) {
      return 48;
    } else if (rank > 30) {
      return 34 + Math.floor((rank - 30) / 3);
    } else if (rank === 30) {
      return 34;
    }
    return 20 + Math.floor(rank / 3);
  }

  class PADData {
    constructor() {
      this.load();
    }

    save() {
      localStorage.setItem('pad-data', JSON.stringify(data));
    }

    load() {
      let savedData = JSON.parse(localStorage.getItem('pad-data'));
      if (savedData === null) {
        savedData = {
          rank: 1,
          lastIncrease: Date.now(),
          stamina: getStaminaForRank(1),
          full: true,
          alerts: [],
        };
      }
      Object.assign(this, savedData);
    }

    setRank(rank) {
      this.rank = rank;
      this.stamina = getStaminaForRank(rank);
      this.full = true;
      this.save();
    }

    setStamina(stamina) {
      const maxStamina = getStaminaForRank(this.rank);

      if (stamina < 0 || stamina > maxStamina) {
        throw `Invalid amount of stamina, ${stamina}`;
      }

      this.stamina = stamina;
      this.full = this.stamina === maxStamina;
      this.lastIncrease = Date.now();
      this.save();
    }

    updateStamina() {
      const maxStamina = getStaminaForRank(this.rank);
      const toAdd = Math.floor((Date.now() - this.lastIncrease) / STAMINA_INTERVAL);
      if (toAdd > 0) {
        this.lastIncrease = this.lastIncrease + toAdd * STAMINA_INTERVAL;
        this.stamina = Math.min(this.stamina + toAdd, maxStamina);
      }
      this.full = this.stamina === maxStamina;
      this.save();
    }
  }

  let data = new PADData();
  const ALERT_TEMPLATE = Object.freeze({
    type: 'basic',
    iconUrl: 'images/red_orb.png',
    title: 'PAD Alert',
  });

  function updateBadge() {
    chrome.browserAction.setBadgeBackgroundColor({
      color: data.full ? 'green' : 'blue'
    });
    chrome.browserAction.setBadgeText({
      text: data.stamina.toString()
    });
  }

  function fireAlerts() {
    const now = new Date();
    data.alerts.forEach(alert => {
      if (alert.stamina) {
        if (data.stamina < alert.stamina) {
          // We've dropped below the threshold and are safe to notify the user again
          alert.notified = false;
        } else {
          if (alert.notified) {
            return;
          }

          const notification = {
            message: `Your stamina has reached ${alert.stamina}`,
          };
          Object.assign(notification, ALERT_TEMPLATE);
          alert.notified = true;
          chrome.notifications.create(notification);
        }
      } else {
        if (!(now.getHours() === alert.hour && now.getMinutes() === alert.minute)) {
          alert.notified = false;
        } else {
          if (alert.notified) {
            return;
          }

          let hour = alert.hour;
          let amPm = 'AM';
          if (hour === 0) {
            hour = 12;
          } else if (hour > 12) {
            hour -= 12;
            am = 'PM';
          } else if (hour === 12) {
            am = 'PM';
          }

          const notification = {
            message: `It is now ${hour}:${alert.minute} ${amPm}`,
          };
          Object.assign(notification, ALERT_TEMPLATE);

          alert.notified = true;
          chrome.notifications.create(notification);
        }
      }
    });
    data.alerts = data.alerts.filter(a => !(a.notified && a.once));
  }

  setInterval(() => {
    data.updateStamina();
    updateBadge();
    fireAlerts();
  }, 1000);

  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    switch (msg.type) {
      case 'getData':
        sendResponse(data);
        break;
      case 'run':
        try {
          data.setStamina(data.stamina - msg.cost);
        } catch(e) {
          console.error(e);
          sendResponse(false);
          return;
        }

        sendResponse(true);
        updateBadge();
        break;
      case 'update':
        if (msg.rank) {
          data.setRank(msg.rank);
        }
        if (msg.hasOwnProperty('stamina')) {
          data.setStamina(msg.stamina);
        }
        updateBadge();
        break;
      case 'alert':
        delete msg.type;
        data.alerts.push(msg);
        sendResponse(data.alerts);
        break;
      case 'remove':
        data.alerts.splice(msg.alertNum, 1);
        sendResponse(data.alerts);
        break;
      default:
        console.error('Received unknown type of message');
        console.error(msg);
        break;
    }
  });
}());
