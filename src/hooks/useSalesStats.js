import { useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabaseClient";

/**
 * useSalesStats
 * - 매장의 매출 통계 계산
 * - 오늘 매출, 시간별 매출, 인기 메뉴, 어제 대비 등
 *
 * @param {string} storeId - 매장 ID
 * @returns {object} { stats, loading, error, refetch }
 */
export function useSalesStats(storeId) {
  const [stats, setStats] = useState({
    todayRevenue: 0,
    yesterdayRevenue: 0,
    weekRevenue: 0,
    monthRevenue: 0,
    todayCustomers: 0,
    todayOrders: 0,
    avgPerCustomer: 0,
    hourlyRevenue: [], // [{ hour: 18, revenue: 32000 }, ...]
    topMenus: [], // [{ name, icon, count, revenue }, ...]
    peakHour: null,
    revenueChangePct: 0,
    monthlyHistory: [], // [{ year, month, label, revenue, orderCount, sessionCount, isCurrent, changePct, daysInMonth }, ...]
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchStats = useCallback(async () => {
    if (!storeId) {
      setLoading(false);
      return;
    }
    setLoading(true);

    // 오늘 자정
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    // 어제 자정
    const yesterdayStart = new Date(todayStart);
    yesterdayStart.setDate(yesterdayStart.getDate() - 1);

    // 이번 주 시작 (일요일 자정)
    const weekStart = new Date(todayStart);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());

    // 이번 달 1일 자정
    const monthStart = new Date(todayStart);
    monthStart.setDate(1);

    // 6개월 전 1일 (월별 히스토리용)
    const sixMonthsAgo = new Date(todayStart);
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
    sixMonthsAgo.setDate(1);
    sixMonthsAgo.setHours(0, 0, 0, 0);

    // 오늘 주문
    const { data: todayOrders, error: todayErr } = await supabase
      .from("orders")
      .select("*")
      .eq("store_id", storeId)
      .gte("created_at", todayStart.toISOString());

    // 어제 주문
    const { data: yesterdayOrders, error: yesterdayErr } = await supabase
      .from("orders")
      .select("price")
      .eq("store_id", storeId)
      .gte("created_at", yesterdayStart.toISOString())
      .lt("created_at", todayStart.toISOString());

    // 이번 주 주문
    const { data: weekOrders } = await supabase
      .from("orders")
      .select("price")
      .eq("store_id", storeId)
      .gte("created_at", weekStart.toISOString());

    // 이번 달 주문
    const { data: monthOrders } = await supabase
      .from("orders")
      .select("price")
      .eq("store_id", storeId)
      .gte("created_at", monthStart.toISOString());

    // 6개월 주문 (월별 히스토리용)
    const { data: sixMonthsOrders } = await supabase
      .from("orders")
      .select("price, created_at")
      .eq("store_id", storeId)
      .gte("created_at", sixMonthsAgo.toISOString())
      .order("created_at", { ascending: true });

    // 6개월 세션 (운영 일수 계산용)
    const { data: sixMonthsSessions } = await supabase
      .from("sessions")
      .select("opened_at")
      .eq("store_id", storeId)
      .gte("opened_at", sixMonthsAgo.toISOString());

    // 오늘 세션 (손님 수)
    const { data: todaySessions } = await supabase
      .from("sessions")
      .select("id")
      .eq("store_id", storeId)
      .gte("opened_at", todayStart.toISOString());

    if (todayErr || yesterdayErr) {
      setError(todayErr || yesterdayErr);
      setLoading(false);
      return;
    }

    const todayList = todayOrders || [];
    const yesterdayList = yesterdayOrders || [];
    const sessions = todaySessions || [];

    // 1. 총 매출
    const todayRevenue = todayList.reduce((sum, o) => sum + (o.price || 0), 0);
    const yesterdayRevenue = yesterdayList.reduce((sum, o) => sum + (o.price || 0), 0);
    const weekRevenue = (weekOrders || []).reduce((sum, o) => sum + (o.price || 0), 0);
    const monthRevenue = (monthOrders || []).reduce((sum, o) => sum + (o.price || 0), 0);

    // 2. 어제 대비 변화율 (% 변화)
    let revenueChangePct = 0;
    if (yesterdayRevenue > 0) {
      revenueChangePct = Math.round(
        ((todayRevenue - yesterdayRevenue) / yesterdayRevenue) * 100
      );
    } else if (todayRevenue > 0) {
      revenueChangePct = 100;
    }

    // 3. 시간별 매출 (영업 시간: 17~새벽3시 = 17,18,19,20,21,22,23,0,1,2)
    const HOURS = [17, 18, 19, 20, 21, 22, 23, 0, 1, 2];
    const hourlyMap = new Map();
    HOURS.forEach(h => hourlyMap.set(h, 0));

    todayList.forEach(o => {
      const hour = new Date(o.created_at).getHours();
      if (hourlyMap.has(hour)) {
        hourlyMap.set(hour, hourlyMap.get(hour) + (o.price || 0));
      }
    });

    const hourlyRevenue = HOURS.map(h => ({
      hour: h,
      label: h === 0 ? "12am" : h === 12 ? "12pm" : h < 12 ? `${h}` : `${h - 12}`,
      revenue: hourlyMap.get(h),
    }));

    // 4. 피크 시간대
    let peakHour = null;
    let peakValue = 0;
    hourlyRevenue.forEach(h => {
      if (h.revenue > peakValue) {
        peakValue = h.revenue;
        peakHour = h.hour;
      }
    });

    // 5. 인기 메뉴 TOP 5 (오늘)
    const menuMap = new Map();
    todayList.forEach(o => {
      const key = o.menu_name;
      if (!menuMap.has(key)) {
        menuMap.set(key, {
          name: o.menu_name,
          icon: o.menu_icon || "🍸",
          count: 0,
          revenue: 0,
        });
      }
      const item = menuMap.get(key);
      item.count += 1;
      item.revenue += o.price || 0;
    });

    const topMenus = Array.from(menuMap.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // 6. 객단가 = 매출 / 손님 수
    const avgPerCustomer = sessions.length > 0
      ? Math.round(todayRevenue / sessions.length)
      : 0;

    // 7. 월별 히스토리 (최근 6개월)
    const monthlyMap = new Map(); // key: "2026-04", value: { revenue, orderCount, days: Set, sessionCount }

    // 빈 6개월 미리 채우기 (데이터 없는 달도 표시)
    const today = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      monthlyMap.set(key, {
        year: d.getFullYear(),
        month: d.getMonth() + 1,
        revenue: 0,
        orderCount: 0,
        days: new Set(),
        sessionCount: 0,
      });
    }

    // 주문 매출 합산
    (sixMonthsOrders || []).forEach(o => {
      const d = new Date(o.created_at);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      if (monthlyMap.has(key)) {
        const item = monthlyMap.get(key);
        item.revenue += o.price || 0;
        item.orderCount += 1;
        item.days.add(d.getDate()); // 운영 일수 카운트
      }
    });

    // 세션 수 합산
    (sixMonthsSessions || []).forEach(s => {
      const d = new Date(s.opened_at);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      if (monthlyMap.has(key)) {
        monthlyMap.get(key).sessionCount += 1;
      }
    });

    // 배열로 변환 + 변화율 계산 (최신 → 과거)
    const monthlyArray = Array.from(monthlyMap.values()).reverse();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth() + 1;

    const monthlyHistory = monthlyArray.map((item, idx) => {
      const isCurrent = item.year === currentYear && item.month === currentMonth;
      // 다음 항목이 이전 달 (배열은 최신→과거 순)
      const prevMonth = monthlyArray[idx + 1];
      let changePct = null;
      if (prevMonth && prevMonth.revenue > 0) {
        changePct = Math.round(((item.revenue - prevMonth.revenue) / prevMonth.revenue) * 100);
      } else if (prevMonth && prevMonth.revenue === 0 && item.revenue > 0) {
        changePct = null; // 비교 의미 없음
      }

      return {
        year: item.year,
        month: item.month,
        label: `${item.year}.${String(item.month).padStart(2, "0")}`,
        revenue: item.revenue,
        orderCount: item.orderCount,
        sessionCount: item.sessionCount,
        daysOperated: item.days.size,
        isCurrent,
        changePct,
      };
    });

    setStats({
      todayRevenue,
      yesterdayRevenue,
      weekRevenue,
      monthRevenue,
      todayCustomers: sessions.length,
      todayOrders: todayList.length,
      avgPerCustomer,
      hourlyRevenue,
      topMenus,
      peakHour,
      revenueChangePct,
      monthlyHistory,
    });
    setError(null);
    setLoading(false);
  }, [storeId]);

  useEffect(() => {
    fetchStats();

    if (!storeId) return;

    // 새 주문 생기면 통계 재계산
    const channel = supabase
      .channel(`sales-stats-${storeId}-${Date.now()}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "orders",
          filter: `store_id=eq.${storeId}`,
        },
        () => fetchStats()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storeId]);

  return {
    stats,
    loading,
    error,
    refetch: fetchStats,
  };
}
