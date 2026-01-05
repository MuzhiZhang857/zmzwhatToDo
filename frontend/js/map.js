// frontend/js/map.js
/**
 * 百度地图集成模块（可降级版）
 * 地标：内蒙古大学创业学院（南校区）
 * 特点：
 * 1. 未加载百度地图 SDK 时自动降级，不报错、不误导
 * 2. SDK 一旦存在，地图功能自动恢复
 */

document.addEventListener("DOMContentLoaded", () => {
  initMapSafe();
});

function initMapSafe() {
  const container = document.getElementById("baidu-map");
  if (!container) return;

  // 保证区域高度，避免布局塌陷
  container.style.minHeight = "260px";
  container.classList.add("bg-white", "rounded", "shadow", "p-3");

  // === 情况 1：百度地图 SDK 根本没加载（你现在就是这个状态） ===
  if (typeof window.BMap === "undefined") {
    showMapUnavailable(container);
    return;
  }

  // === 情况 2：SDK 存在，尝试初始化 ===
  try {
    initBaiduMap(container);
  } catch (err) {
    console.error("地图初始化异常：", err);
    showMapInitError(container);
  }
}

/**
 * 初始化百度地图（创业学院为地标）
 */
function initBaiduMap(container) {
  container.innerHTML = ""; // 清空降级提示

  // 创建地图实例
  const map = new BMap.Map("baidu-map");

  // 内蒙古大学创业学院（南校区）坐标
  const point = new BMap.Point(111.700, 40.753);
  map.centerAndZoom(point, 15);

  // 基础交互
  map.enableScrollWheelZoom(true);
  map.addControl(new BMap.NavigationControl());
  map.addControl(new BMap.ScaleControl());

  // 标记点
  const marker = new BMap.Marker(point);
  map.addOverlay(marker);

  // 信息窗口
  const infoWindow = new BMap.InfoWindow(
    "<strong>内蒙古大学创业学院（南校区）</strong>"
  );
  marker.addEventListener("click", () => {
    map.openInfoWindow(infoWindow, point);
  });

  // 校园区域覆盖
  addSchoolArea(map, point);
}

/**
 * 添加校园区域覆盖物
 */
function addSchoolArea(map, centerPoint) {
  const points = [
    new BMap.Point(111.6966, 40.75585),
    new BMap.Point(111.6987, 40.7513),
    new BMap.Point(111.7031, 40.7525),
    new BMap.Point(111.7012, 40.7569),
  ];

  const polygon = new BMap.Polygon(points, {
    strokeColor: "#2563eb",
    strokeWeight: 2,
    strokeOpacity: 0.8,
    fillColor: "#3b82f6",
    fillOpacity: 0.25,
  });

  map.addOverlay(polygon);

  const label = new BMap.Label("创业学院校园区域", {
    position: centerPoint,
    offset: new BMap.Size(20, -10),
  });

  label.setStyle({
    color: "#111827",
    fontSize: "12px",
    border: "none",
    padding: "2px 6px",
    backgroundColor: "rgba(255,255,255,0.75)",
  });

  map.addOverlay(label);
}

/**
 * SDK 不存在时的成熟降级提示
 */
function showMapUnavailable(container) {
  container.innerHTML = `
    <div>
      <div class="font-semibold mb-1">地图功能不可用</div>
      <div class="text-sm text-gray-600 leading-relaxed">
        当前运行环境未加载百度地图外部 SDK（window.BMap 不存在）。
        <br>
        可能原因：网络策略限制、外部资源不可达，或为离线演示模式。
      </div>
      <div class="text-xs text-gray-500 mt-2">
        地标：内蒙古大学创业学院（南校区）
      </div>
    </div>
  `;
}

/**
 * SDK 存在但初始化失败
 */
function showMapInitError(container) {
  container.innerHTML = `
    <div>
      <div class="font-semibold mb-1 text-red-600">地图初始化失败</div>
      <div class="text-sm text-gray-600">
        已自动降级显示，不影响系统其他功能。
      </div>
    </div>
  `;
}

// 可选导出（保留你原来的接口习惯）
window.initBaiduMap = initBaiduMap;
