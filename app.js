let mainChart;

const app = Vue.createApp({
  data() {
    return {
      initialAmount: 1000,
      btcBought: 0.02,
      currentAmount: 0,
      currentPrice: 0,
      currentRate: 0,

      history: {},
      timeUpdated: "",
      isoTime: "",

      chartLabels: [1, 2, 3, 4, 5, 6, 7],
      chartPoints: [65, 59, 80, 81, 56, 55, 40],
      chartOptions: {
        scales: {
          y: {
            title: {
              display: true,
              text: "SGD",
            },
          },
        },
      },

      isUpdated: true,
    };
  },
  computed: {
    chartHeignt() {
      return document.documentElement.clientWidth < 500 ? 300 : 150;
    },
    logoHeight() {
      return document.documentElement.clientWidth < 500 ? 50 : 100;
    },
    chartData() {
      return {
        labels: this.chartLabels,
        datasets: [
          {
            label: "Bitcoin Price",
            data: this.chartPoints,
            fill: true,
            backgroundColor: "rgba(0,0,128,0.5)",
            borderColor: "navy",
            tension: 0.1,
          },
        ],
      };
    },
    currentPriceFormatted() {
      return this.currentPrice.toLocaleString();
    },
    totalReturns() {
      return this.currentAmount - this.initialAmount;
    },
    totalReturnsFormatted() {
      let trf = this.formatNumberDP(this.totalReturns, 2);

      //Trick to make trf positive since it is a STRING
      if (trf.charAt(0) === "-") {
        return trf.substring(1);
      }
      return trf;
    },
    totalReturnsSign() {
      return this.totalReturns >= 0 ? "" : "-";
    },
    percentageReturns() {
      return (this.totalReturns / this.initialAmount) * 100;
    },
    percentageReturnsFormatted() {
      let prf = this.formatNumberDP(this.percentageReturns, 1);

      //Trick to make prf positive since it is a STRING
      if (prf.charAt(0) === "-") {
        return prf.substring(1);
      }
      return prf;
    },
    gainOrLoss() {
      return this.totalReturns >= 0 ? "gain" : "loss";
    },
    currentAmountFormatted() {
      return this.formatNumberDP(this.currentAmount, 2);
    },
    currentRateFormatted() {
      return this.formatNumberDP(this.currentRate, 5);
    },
    updateStatus() {
      return this.isUpdated ? "Updated!" : "Update to save changes.";
    },
  },
  methods: {
    formatNumberDP(value, dp) {
      try {
        return value.toLocaleString(undefined, {
          minimumFractionDigits: dp,
          maximumFractionDigits: dp,
        });
      } catch (err) {
        console.log(err);
        return value;
      }
    },
    slotDataIntoChart() {
      this.chartLabels = [];
      this.chartPoints = [];
      for (let key in this.history) {
        // console.log(key, this.history[key]);
        this.chartLabels.push(key);
        this.chartPoints.push(this.history[key] * this.currentRate);
      }
      // console.log(this.isoTime.substring(0, 10));
      // console.log(this.currentPrice);
      this.chartLabels.push(this.isoTime.substring(0, 10));
      this.chartPoints.push(this.currentPrice);
    },
    createChart() {
      this.slotDataIntoChart();
      let ctx = document.getElementById("myChart").getContext("2d");
      mainChart = new Chart(ctx, {
        type: "line",
        data: this.chartData,
        options: this.chartOptions,
      });
    },
    updateChart() {
      // location.reload();
      fetch("https://api.coindesk.com/v1/bpi/historical/close.json")
        .then((res) => res.json())
        .then((data) => {
          console.log(data);
          this.history = data.bpi;
        })
        .then(() => {
          this.slotDataIntoChart();
          mainChart.data.labels = this.chartLabels;
          mainChart.data.datasets[0].data = this.chartPoints;
          mainChart.update();
        });
    },
    getCurrentPrice() {
      fetch("https://api.coindesk.com/v1/bpi/currentprice/SGD.json")
        .then((res) => res.json())
        .then((data) => {
          console.log(data);

          this.currentRate = data.bpi.SGD.rate_float / data.bpi.USD.rate_float;
          this.currentPrice = data.bpi.SGD.rate_float;
          this.currentAmount = this.currentPrice * this.btcBought;

          this.isoTime = data.time.updatedISO;
          this.timeUpdated = new Date(this.isoTime).toString();
        });

      localStorage.setItem("myInitial", this.initialAmount);
      localStorage.setItem("myBtc", this.btcBought);
      this.isUpdated = true;
    },
  },
  mounted() {
    console.log("App mounted!");

    //Checking if there is localStorage.
    //If none, default values of $1000 at 0.02BTC will be used.
    if (localStorage.getItem("myInitial")) {
      this.initialAmount = localStorage.getItem("myInitial");
    }
    if (localStorage.getItem("myBtc")) {
      this.btcBought = localStorage.getItem("myBtc");
    }

    //This method provides everything, except the chart.
    this.getCurrentPrice();

    /* Note 25 Apr 2021:
    Sometimes the response of getCurrentPrice returns too late.
    When this happens, the chart values will not be displayed. To fix this,
    getCurrentPrice should be called async and await the response before proceeding.
    I am too lazy to figure this out, and I'm happy with the 'Update Chart' fix for now.
    Good luck, future Zhun Song!
    */

    //This method provides chart data
    fetch("https://api.coindesk.com/v1/bpi/historical/close.json")
      .then((res) => res.json())
      .then((data) => {
        console.log(data);
        this.history = data.bpi;
      })
      .then(() => {
        this.createChart();
      });
  },
});

app.mount("#vue-mount");
