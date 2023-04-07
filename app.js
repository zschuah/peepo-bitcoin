let mainChart;

const app = Vue.createApp({
  data() {
    return {
      initialAmount: 1000,
      btcBought: 0.02,
      currentAmount: 0,
      currentPrice: 0,
      currentRate: 0,
      currentPriceUrl: "https://api.coindesk.com/v1/bpi/currentprice/SGD.json",

      history: {},
      timeUpdated: "",
      isoTime: "",
      historicalPriceUrl:
        "https://api.coingecko.com/api/v3/coins/bitcoin/market_chart?vs_currency=USD&days=30&interval=daily",

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
      //SETUP data points from CoinGecko
      for (let item of this.history) {
        // console.log(item);
        this.chartLabels.push(item[0]);
        this.chartPoints.push(item[1] * this.currentRate);
      }

      //REPLACE last element(s) with the one from CoinDesk
      this.chartLabels.splice(this.chartLabels.length - 2, 2);
      this.chartPoints.splice(this.chartLabels.length - 2, 2);
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
    convertJsonDataToChartData(data) {
      let tempArray = data.prices;
      tempArray.forEach((item) => {
        item[0] = new Date(item[0]).toISOString().substring(0, 10);
      });
      this.history = tempArray;
    },
    updateChart() {
      // location.reload();
      fetch(this.historicalPriceUrl)
        .then((res) => res.json())
        .then((data) => {
          console.log(data);
          this.convertJsonDataToChartData(data);
        })
        .then(() => {
          this.slotDataIntoChart();
          mainChart.data.labels = this.chartLabels;
          mainChart.data.datasets[0].data = this.chartPoints;
          mainChart.update();
        });
    },
    getCurrentPrice() {
      fetch(this.currentPriceUrl)
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
  watch: {
    //Whenever currentPrice changes, this function will run
    currentPrice(newPrice, oldPrice) {
      if (oldPrice === 0) {
        //This method provides chart data
        fetch(this.historicalPriceUrl)
          .then((res) => res.json())
          .then((data) => {
            console.log(data);
            this.convertJsonDataToChartData(data);
          })
          .then(() => {
            this.createChart();
          });
      }
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

    /* Note 28 Oct 2022:
    Hello there, future Zhun Song here!
    You were right in assessing that the getCurrentPrice needs to be called first.
    Async/Await would make sense for React, but this is Vue. You can simply use
    watch and watch for changes in the old value and update accordingly.
    I've implemented the updates!
    */

    //This method provides chart data
    // fetch(this.historicalPriceUrl)
    //   .then((res) => res.json())
    //   .then((data) => {
    //     console.log(data);
    //     this.convertJsonDataToChartData(data);
    //   })
    //   .then(() => {
    //     this.createChart();
    //   });
  },
});

app.mount("#vue-mount");
