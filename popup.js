/* globals chrome */

(function() {
  'use strict'

  const STAMINA_INTERVAL = 3 * 60 * 1000;

  function showToast(msg) {
    const container = document.getElementById('toast-container');
    container.classList.add('visible');
    container.querySelector('.message').innerText = msg;

    setTimeout(() => {
      container.classList.remove('visible');
    }, 2000);
  }

  let cost = localStorage.getItem('cost');
  if (cost !== null) {
    cost = parseInt(cost, 10);

    let lastRun = document.querySelector(`[data-cost="${cost}"]`);
    if (lastRun !== null) {
      document.getElementById('custom-cost').value = cost;
    }
  }

  document.getElementById('user-info-form').addEventListener('submit', function(e) {
    e.preventDefault();

    const msg = {
      type: 'update',
    };
    ['rank', 'stamina'].forEach(f => {
      const v = this[f].value;
      if (v.length > 0) {
        msg[f] = parseInt(v, 10);
      }
    });

    chrome.runtime.sendMessage(msg);
  });

  const costButtons = document.querySelectorAll('[data-cost]');
  const customCostInput = document.getElementById('custom-cost');
  customCostInput.addEventListener('blur', function(e) {
    if (this.value !== '') {
      cost = parseInt(this.value, 10);
      costButtons.forEach(b => b.classList.remove('selected'));
    }
  });

  costButtons.forEach(b => {
    b.addEventListener('click', function() {
      costButtons.forEach(b => b.classList.remove('selected'));
      customCostInput.value = '';

      cost = parseInt(this.getAttribute('data-cost'), 10);
      this.classList.add('selected');
    });
  });

  document.getElementById('run-form').addEventListener('submit', function(e) {
    e.preventDefault();

    chrome.runtime.sendMessage({
      type: 'run',
      cost,
    }, success => {
      if (success) {
        localStorage.setItem('cost', cost);
      } else {
        showToast('Are you sure it cost that much?');
      }
    });

  });

  function updateStamina(stamina) {
    const staminaInput = document.getElementById('user-info-form').stamina;
    if (staminaInput !== document.activeElement) {
      staminaInput.value = stamina;
    }
  }

  function updateRank(rank) {
    const rankInput = document.getElementById('user-info-form').rank;
    if (rankInput !== document.activeElement) {
      rankInput.value = rank;
    }
  }

  function initAlerts() {
    document.getElementById('alert-form').addEventListener('submit', function(e) {
      e.preventDefault();

      let msg = null;
      if (this.stamina.value !== '') {
        msg = {
          type: 'alert',
          stamina: parseInt(this.stamina.value, 10),
        };
        this.stamina.value = '';
      } else if (this.hour.value !== '' && this.minute.value !== '') {
        let hour = parseInt(this.hour.value, 10);
        if (this['am-pm'].value === 'PM' && hour !== 12) {
          hour = (hour + 12) % 24;
        } else if (this['am-pm'].value === 'AM' && hour === 12) {
          hour = 0;
        }
        msg = {
          type: 'alert',
          hour,
          minute: parseInt(this.minute.value, 10),
        };

        this.hour.value = '';
        this.minute.value = '';
      }
      if (msg === null) {
        return;
      }

      chrome.runtime.sendMessage(msg, alerts => {
        updateAlerts(alerts);
      });
    });

    chrome.runtime.sendMessage({
      type: 'getData'
    }, data => {
      updateAlerts(data.alerts);
    });
  }

  function getConditionText(alert) {
    if (alert.stamina) {
      return `>= <span style="color: blue">${alert.stamina}</span> stamina`;
    }

    let hour = alert.hour;
    let amPm = 'AM';
    if (hour === 0) {
      hour = 12;
    } else if (hour > 12) {
      hour -= 12;
      amPm = 'PM';
    } else if (hour === 12) {
      amPm = 'PM';
    }

    return `${hour}:${alert.minute} ${amPm}`;
  }

  function updateAlerts(alerts) {
    const table = document.querySelector('#alert-tab tbody');
    table.innerHTML = '';
    alerts.forEach((alert, i) => {
      table.innerHTML += `
      <tr>
        <td>${alert.stamina ? 'Stamina' : 'Time'}</td>
        <td>${getConditionText(alert)}</td>
        <td><button data-alert-num="${i}">Remove</button></td>
      </tr>
      `
    });

    document.querySelectorAll('#alert-tab tbody button').forEach(button => {
      button.addEventListener('click', function() {
        const alertNum = parseInt(this.getAttribute('data-alert-num'), 10);
        chrome.runtime.sendMessage({
          type: 'remove',
          alertNum: alertNum,
        }, alerts => {
          updateAlerts(alerts);
        });
      });
    });
  }

  function showTab(tab) {
    const alertTab = document.getElementById('alert-tab');
    const mainTab = document.getElementById('main-tab');
    if (tab === 'Alerts') {
      document.body.classList.add('wide');
      mainTab.classList.remove('visible');
      alertTab.classList.add('visible');
    } else {
      document.body.classList.remove('wide');
      mainTab.classList.add('visible');
      alertTab.classList.remove('visible');
    }
  }

  function initTabs() {
    const tabButtons = document.querySelectorAll('#tab-bar span');
    tabButtons.forEach(button => {
      button.addEventListener('click', function() {
        showTab(this.innerText);
        tabButtons.forEach(button => button.classList.remove('selected'));
        this.classList.add('selected');
      });
    });
  }

  let data = {};

  function redraw() {
    chrome.runtime.sendMessage({
      type: 'getData'
    }, data => {
      updateStamina(data.stamina);
      updateRank(data.rank);
    });
  }

  initAlerts();
  initTabs();
  redraw();
  setInterval(redraw, 1000);
}());
