// frontend/js/calendar.js
// 当前月热力图 + 总体/done切换 + tooltip 不出屏
// 依赖：vendor/echarts.min.js、js/api.js（window.API.apiFetch）
// 容器：#calendar-container

(function () {
  if (!window.echarts) {
    console.error("ECharts 未加载");
    return;
  }
  if (!window.API || !API.apiFetch) {
    console.error("API 未加载");
    return;
  }

  function pad2(n) {
    return String(n).padStart(2, "0");
  }

  function ymd(d) {
    return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
  }

  function ymdCn(s) {
    const [y, m, d] = String(s).split("-");
    return `${y}年${m}月${d}日`;
  }

  function monthRange(now) {
    const y = now.getFullYear();
    const m = now.getMonth(); // 0-based
    const start = new Date(y, m, 1);
    const end = new Date(y, m + 1, 0); // last day
    return { start, end };
  }

  async function fetchCalendarStats(from, to) {
    const qs = `?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`;
    return API.apiFetch(`/api/stats/calendar/${qs}`, { method: "GET" });
  }

  function buildMaps(activity, completion) {
    const aMap = new Map();
    const cMap = new Map();

    (Array.isArray(activity) ? activity : []).forEach(([d, v]) => aMap.set(String(d), Number(v || 0)));
    (Array.isArray(completion) ? completion : []).forEach(([d, v]) => cMap.set(String(d), Number(v || 0)));

    return { aMap, cMap };
  }

  function computeMax(arr) {
    const maxVal = arr.reduce((mx, it) => Math.max(mx, Number(it?.value?.[1] || 0)), 0);
    return Math.max(10, maxVal);
  }

  function ensureToggleUI(container) {
    // 插入 “总体 / done” 两个按钮（不改 HTML）
    const wrap = document.createElement("div");
    wrap.className = "flex items-center gap-2 mb-2";

    const btnOverall = document.createElement("button");
    btnOverall.type = "button";
    btnOverall.id = "hm-overall";
    btnOverall.className = "px-2 py-1 text-xs border rounded bg-black text-white";
    btnOverall.textContent = "总览";

    const btnDone = document.createElement("button");
    btnDone.type = "button";
    btnDone.id = "hm-done";
    btnDone.className = "px-2 py-1 text-xs border rounded";
    btnDone.textContent = "已完成";

    wrap.appendChild(btnOverall);
    wrap.appendChild(btnDone);

    container.parentNode.insertBefore(wrap, container);
    return { btnOverall, btnDone };
  }

  function buildOption({ rangeStart, rangeEnd, data, max }) {
    return {
      tooltip: {
        trigger: "item",
        position: function (pos, params, dom, rect, size) {
          const viewWidth = size.viewSize[0];
          const viewHeight = size.viewSize[1];
          const boxWidth = size.contentSize[0];
          const boxHeight = size.contentSize[1];

          let x = pos[0] + 12;
          let y = pos[1] + 12;

          if (x + boxWidth > viewWidth) x = pos[0] - boxWidth - 12;
          if (y + boxHeight > viewHeight) y = pos[1] - boxHeight - 12;

          x = Math.max(8, x);
          y = Math.max(8, y);
          return [x, y];
        },
        formatter: function (p) {
          const d = p?.data?.value?.[0] || "";
          const overall = Number(p?.data?.overall || 0);
          const done = Number(p?.data?.done || 0);
          return `${ymdCn(d)}<br/>发帖：${overall}<br/>完成：${done}`;
        },
      },

      visualMap: {
        min: 0,
        max,
        orient: "horizontal",
        left: "center",
        bottom: 0,
        calculable: true,
      },

      calendar: {
        range: [ymd(rangeStart), ymd(rangeEnd)],
        cellSize: [16, 16],
        left: 10,
        right: 10,
        top: 6,
        bottom: 28,

        dayLabel: { show: false },
        monthLabel: { show: false },
        yearLabel: { show: false },

        splitLine: { show: true },
        itemStyle: { borderWidth: 1 },
      },

      series: [
        {
          type: "heatmap",
          coordinateSystem: "calendar",
          data,
        },
      ],
    };
  }

  async function initCalendar() {
    const el = document.getElementById("calendar-container");
    if (!el) return;

    const now = new Date();
    const { start, end } = monthRange(now);
    const from = ymd(start);
    const to = ymd(end);

    let stats;
    try {
      stats = await fetchCalendarStats(from, to);
    } catch (err) {
      console.error("日历加载失败:", err);
      return;
    }

    el.innerHTML = "";
    el.style.height = "220px";

    const { aMap, cMap } = buildMaps(stats.activity, stats.completion);

    // 构造这个月每天的数据（无数据也填 0，保证格子齐全）
    const dayDataOverall = [];
    const dayDataDone = [];

    const d = new Date(start.getTime());
    while (d <= end) {
      const key = ymd(d);
      const overall = aMap.get(key) || 0;
      const done = cMap.get(key) || 0;

      dayDataOverall.push({
        value: [key, overall], // 用 overall 做颜色
        overall,
        done,
      });

      dayDataDone.push({
        value: [key, done], // 用 done 做颜色
        overall,
        done,
      });

      d.setDate(d.getDate() + 1);
    }

    const chart = echarts.init(el);

    // 插入 toggle（避免重复插入）
    if (!document.getElementById("hm-overall")) {
      var btns = ensureToggleUI(el);
    } else {
      var btns = {
        btnOverall: document.getElementById("hm-overall"),
        btnDone: document.getElementById("hm-done"),
      };
    }

    let mode = "overall";

    function render() {
      const data = mode === "overall" ? dayDataOverall : dayDataDone;
      const max = computeMax(data);

      if (btns.btnOverall && btns.btnDone) {
        if (mode === "overall") {
          btns.btnOverall.className = "px-2 py-1 text-xs border rounded bg-black text-white";
          btns.btnDone.className = "px-2 py-1 text-xs border rounded";
        } else {
          btns.btnOverall.className = "px-2 py-1 text-xs border rounded";
          btns.btnDone.className = "px-2 py-1 text-xs border rounded bg-black text-white";
        }
      }

      chart.setOption(buildOption({ rangeStart: start, rangeEnd: end, data, max }), true);
    }

    if (btns.btnOverall) {
      btns.btnOverall.onclick = () => {
        mode = "overall";
        render();
      };
    }
    if (btns.btnDone) {
      btns.btnDone.onclick = () => {
        mode = "done";
        render();
      };
    }

    render();
    window.addEventListener("resize", () => chart.resize());
  }

  window.initCalendar = initCalendar;
})();
