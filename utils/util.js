const formatTime = date => {
  const year = date.getFullYear()
  const month = date.getMonth() + 1
  const day = date.getDate()
  const hour = date.getHours()
  const minute = date.getMinutes()
  const second = date.getSeconds()

  return [year, month, day].map(formatNumber).join('/') + ' ' + [hour, minute, second].map(formatNumber).join(':')
}

const formatNumber = n => {
  n = n.toString()
  return n[1] ? n : '0' + n
}

// 只响应最后一次promise
class promiseContainer {
  constructor() {
    this.promise = null;
    this.then = null;
  }
  addPromise (promise, then) {
    let that = this;
    that.promise = promise;
    that.then = then;
    promise.then((data) => {
      if (promise === that.promise) {
        that.then(data);
      }
      else {
        console.log("Cancel current promise.");
      }
    });
  }
}

module.exports = {
  formatTime: formatTime,
  promiseContainer: promiseContainer,
}
