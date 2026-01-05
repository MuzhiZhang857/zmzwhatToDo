// frontend/vendor/calendar_heatmap.js
// 依赖：window.echarts、window.API.apiFetch
// 用法：页面上放一个容器 <div id="calendar-heatmap"></div>
// 可选：放两个按钮 <button id="hm-activity">活动</button> <button id="hm-completion">完成</button>

(function () {
  function ymdd(d) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }

  function clamp(n, a, b) {
    return Math.max(a, Math.min(b, n));
  }

  function computeMax(values) {
    const maxVal = values.reduce((mx, x) => Math.max(mx, x[1] || 0), 0);
    // 让色阶有分辨率：至少 10；否则轻度使用也看不出梯度
    return Math.max(10, maxVal);
  }

  async function fetchCalendarStats({ from, to }) {
    // 你后端如果还没 stats 接口，这里会报错；但这就是你现在“计数口径不落地”的根因。
    // 我这里按一个明确接口来：/api/stats/calendar/?from=YYYY-MM-DD&to=YYYY-MM-DD
    // 返回：
    // {
    //   activity: [["2026-01-01", 3], ...],
    //   completion: [["2026-01-01", 5], ...],
    //   meta: { activity_label:"发帖数", completion_label:"完成项数" }
    // }
    const qs = `?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`;
    return API.apiFetch(`/api/stats/calendar/${qs}`, { method: "GET" });
  }

  function buildOption({ year, seriesData, label, max }) {
    return {
      tooltip: {
        position: "top",
        formatter: function (p) {
          const v = p.data ? p.data[1] : 0;
          return `${p.data[0]}<br/>${label}：${v}`;
        },
      },
      visualMap: {
        min: 0,
        max: max,
        orient: "horizontal",
        left: "center",
        bottom: 10,
        calculable: true,
      },
      calendar: {
        range: year,
        cellSize: ["auto", 16],
        splitLine: { show: true },
        itemStyle: { borderWidth: 1 },
        yearLabel: { show: true },
      },
      series: [
        {
          type: "heatmap",
          coordinateSystem: "calendar",
          data: seriesData,
        },
      ],
    };
  }

  async function init() {
    const el = document.getElementById("calendar-heatmap");
    if (!el || !window.echarts || !window.API || !API.apiFetch) return;

    const now = new Date();
    const year = now.getFullYear();
    const from = `${year}-01-01`;
    const to = ymdd(now);

    let stats;
    try {
      stats = await fetchCalendarStats({ from, to });
    } catch (err) {
      // 明确告诉你：后端没提供口径，就不可能“正确计数”
      el.innerHTML = `<div style="padding:12px;border:1px solid #eee;color:#666;">
        日历数据接口不可用：${(err && err.message) || "未知错误"}<br/>
        请确认已实现 /api/stats/calendar/（返回 activity/completion 两条序列）。
      </div>`;
      return;
    }

    const activity = Array.isArray(stats.activity) ? stats.activity : [];
    const completion = Array.isArray(stats.completion) ? stats.completion : [];

    const labels = stats.meta || {};
    const activityLabel = labels.activity_label || "发帖数";
    const completionLabel = labels.completion_label || "完成项数";

    let mode = "activity";

    const chart = echarts.init(el);

    function render() {
      const data = mode === "activity" ? activity : completion;
      const label = mode === "activity" ? activityLabel : completionLabel;
      const max = computeMax(data);
      chart.setOption(buildOption({ year, seriesData: data, label, max }), true);
    }

    render();

    const btnA = document.getElementById("hm-activity");
    const btnC = document.getElementById("hm-completion");

    if (btnA) {
      btnA.addEventListener("click", () => {
        mode = "activity";
        render();
      });
    }
    if (btnC) {
      btnC.addEventListener("click", () => {
        mode = "completion";
        render();
      });
    }

    window.addEventListener("resize", () => chart.resize());
  }

  window.initCalendarHeatmap = init;
})();
