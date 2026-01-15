class At extends Error {
  constructor(h) {
    super(h), this.name = "InventoryError";
  }
}
class d extends At {
  constructor(h, C) {
    super(h), this.field = C, this.name = "ValidationError";
  }
}
function xt(w) {
  const h = /* @__PURE__ */ new Map(), C = {
    itemAdded: [],
    itemRemoved: [],
    itemTransferred: [],
    containerFull: [],
    slotChanged: [],
    containerRemoved: []
  };
  let _ = null;
  const Q = (w == null ? void 0 : w.getItemWeight) ?? (() => 1), U = (w == null ? void 0 : w.getItemSize) ?? (() => ({ width: 1, height: 1 })), p = (w == null ? void 0 : w.getItemStackLimit) ?? (() => (w == null ? void 0 : w.defaultStackSize) ?? 99);
  function A(e) {
    const t = Q(e);
    if (typeof t != "number" || isNaN(t) || t < 0)
      throw new d(`getItemWeight must return a valid non-negative number for item "${e}"`);
    if (t === 0)
      throw new d(`getItemWeight must return a positive number for item "${e}" (zero weight not allowed)`);
    return t;
  }
  function x(e) {
    const t = U(e);
    if (typeof t != "object" || typeof t.width != "number" || typeof t.height != "number" || t.width <= 0 || t.height <= 0)
      throw new d("getItemSize must return {width, height} with positive numbers");
    return t;
  }
  function L(e, t) {
    if (h.has(e))
      throw new d(`Container "${e}" already exists`);
    if (!["unlimited", "count", "weight", "grid", "slots", "combined"].includes(t.mode))
      throw new d(`Invalid container mode: "${t.mode}"`);
    const n = {
      id: e,
      config: t,
      items: /* @__PURE__ */ new Map(),
      lockedItems: /* @__PURE__ */ new Set()
    };
    if (t.mode === "grid") {
      if (t.width <= 0 || t.height <= 0)
        throw new d("Grid dimensions must be positive");
      if (t.width > 1e4 || t.height > 1e4)
        throw new d("Grid dimensions cannot exceed 10000");
      if (t.width * t.height > 1e6)
        throw new d("Grid cannot exceed 1000000 total cells");
      n.gridState = {
        width: t.width,
        height: t.height,
        cells: Array.from(
          { length: t.height },
          () => Array.from({ length: t.width }, () => null)
        )
      };
    }
    t.mode === "slots" && (n.slotState = {
      slots: new Map(t.slots.map((o) => [o, null]))
    }), h.set(e, n);
  }
  function B(e) {
    if (!h.has(e))
      throw new d(`Container "${e}" does not exist`);
    S("containerRemoved", { containerId: e }), h.delete(e);
  }
  function K() {
    return Array.from(h.keys());
  }
  function g(e) {
    const t = h.get(e);
    if (!t)
      throw new d(`Container "${e}" does not exist`);
    return t;
  }
  function R(e, t) {
    const i = h.get(t);
    if (!i) return !1;
    for (const n of i.items.keys())
      if (n === e || h.has(n) && R(e, n))
        return !0;
    return !1;
  }
  function v(e, t, i) {
    if (i === 0)
      return { success: !0, added: 0, overflow: 0 };
    if (e === t)
      throw new d("Cannot nest container in itself");
    if (h.has(t) && R(e, t))
      throw new d("Cannot create circular nesting");
    const n = g(e), o = n.config;
    return o.mode === "unlimited" ? G(n, t, i) : o.mode === "count" ? V(n, t, i) : o.mode === "weight" ? Y(n, t, i) : o.mode === "grid" ? N(n, t, i) : o.mode === "combined" ? Z(n, t, i) : { success: !1, added: 0, overflow: i, reason: "unsupported_mode" };
  }
  function G(e, t, i) {
    const n = e.config, o = e.items.get(t) ?? [], r = Math.min(
      n.maxStackSize ?? 1 / 0,
      p(t)
    );
    let s = i;
    if (n.allowStacking) {
      for (const a of o)
        if (a.quantity < r) {
          const c = r - a.quantity, l = Math.min(c, s);
          if (a.quantity += l, s -= l, s === 0) break;
        }
      for (; s > 0; ) {
        const a = Math.min(r, s);
        o.push({ itemId: t, quantity: a }), s -= a;
      }
    } else
      for (let a = 0; a < i; a++)
        o.push({ itemId: t, quantity: 1 });
    return e.items.set(t, o), S("itemAdded", {
      containerId: e.id,
      itemId: t,
      quantity: i,
      newTotal: k(e, t)
    }), { success: !0, added: i, overflow: 0 };
  }
  function V(e, t, i) {
    const n = e.config, o = e.items.get(t) ?? [], r = n.allowStacking ? Math.min(n.maxStackSize ?? 1 / 0, p(t)) : 1;
    let s = i, a = 0;
    if (n.allowStacking) {
      for (const f of o)
        if (f.quantity < r) {
          const u = r - f.quantity, m = Math.min(u, s);
          if (f.quantity += m, s -= m, a += m, s === 0) break;
        }
    }
    const c = Array.from(e.items.values()).reduce(
      (f, u) => f + u.length,
      0
    ), l = n.maxCount - c;
    if (s > 0 && l > 0) {
      const f = Math.ceil(s / r), u = Math.min(f, l);
      for (let m = 0; m < u && s > 0; m++) {
        const y = Math.min(r, s);
        o.push({ itemId: t, quantity: y }), s -= y, a += y;
      }
    }
    return o.length > 0 && e.items.set(t, o), a > 0 && S("itemAdded", {
      containerId: e.id,
      itemId: t,
      quantity: a,
      newTotal: k(e, t)
    }), s > 0 ? (S("containerFull", {
      containerId: e.id,
      itemId: t,
      overflow: s
    }), { success: !1, added: a, overflow: s, reason: "count_exceeded" }) : { success: !0, added: a, overflow: 0 };
  }
  function Y(e, t, i) {
    const n = e.config, o = A(t), r = M(e), s = n.maxWeight - r, a = Math.floor(s / o);
    if (a === 0)
      return S("containerFull", {
        containerId: e.id,
        itemId: t,
        overflow: i
      }), { success: !1, added: 0, overflow: i, reason: "weight_exceeded" };
    const c = Math.min(i, a), l = G(e, t, c);
    if (c < i) {
      const f = i - c;
      return S("containerFull", {
        containerId: e.id,
        itemId: t,
        overflow: f
      }), { success: !1, added: c, overflow: f, reason: "weight_exceeded" };
    }
    return l;
  }
  function N(e, t, i, n) {
    const o = e.config;
    if (x(t), n)
      return q(e, t, i, n);
    if (!o.allowStacking) {
      let a = 0, c = i;
      for (let l = 0; l < i; l++) {
        const f = z(e.id, t);
        if (f.length === 0)
          return S("containerFull", {
            containerId: e.id,
            itemId: t,
            overflow: c
          }), a === 0 ? { success: !1, added: 0, overflow: c, reason: "no_space" } : { success: !0, added: a, overflow: c };
        const u = f[0];
        if (!u)
          return a === 0 ? { success: !1, added: 0, overflow: c, reason: "no_space" } : { success: !0, added: a, overflow: c };
        const m = q(e, t, 1, u);
        if (!m.success)
          return a === 0 ? { success: !1, added: 0, overflow: c, reason: m.reason ?? "no_space" } : { success: !0, added: a, overflow: c };
        a++, c--;
      }
      return { success: !0, added: a, overflow: 0 };
    }
    const s = z(e.id, t)[0];
    return s ? q(e, t, i, s) : (S("containerFull", {
      containerId: e.id,
      itemId: t,
      overflow: i
    }), { success: !1, added: 0, overflow: i, reason: "no_space" });
  }
  function q(e, t, i, n) {
    var f;
    const o = e.config, r = x(t), { width: s, height: a } = n.rotated ? { width: r.height, height: r.width } : r;
    if (o.allowStacking && e.gridState) {
      const u = (f = e.gridState.cells[n.y]) == null ? void 0 : f[n.x];
      if (u && u.isOrigin && u.itemId === t) {
        const y = (e.items.get(t) ?? [])[u.stackIndex];
        if (y)
          return Math.min(
            o.maxStackSize ?? 1 / 0,
            p(t)
          ) - y.quantity >= i ? (y.quantity += i, S("itemAdded", {
            containerId: e.id,
            itemId: t,
            quantity: i,
            newTotal: k(e, t)
          }), { success: !0, added: i, overflow: 0 }) : { success: !1, added: 0, overflow: i, reason: "stack_full" };
      }
    }
    if (!E(e, t, n))
      return { success: !1, added: 0, overflow: i, reason: "no_space" };
    const c = e.items.get(t) ?? [], l = c.length;
    if (c.push({ itemId: t, quantity: i, position: n }), e.items.set(t, c), e.gridState)
      for (let u = 0; u < a; u++)
        for (let m = 0; m < s; m++) {
          const y = n.y + u, I = n.x + m, W = e.gridState.cells[y];
          W && (W[I] = {
            itemId: t,
            stackIndex: l,
            isOrigin: u === 0 && m === 0
          });
        }
    return S("itemAdded", {
      containerId: e.id,
      itemId: t,
      quantity: i,
      newTotal: k(e, t)
    }), { success: !0, added: i, overflow: 0 };
  }
  function E(e, t, i) {
    var s;
    if (!e.gridState) return !1;
    const n = x(t), { width: o, height: r } = i.rotated ? { width: n.height, height: n.width } : n;
    if (i.x < 0 || i.y < 0 || i.x + o > e.gridState.width || i.y + r > e.gridState.height)
      return !1;
    for (let a = 0; a < r; a++)
      for (let c = 0; c < o; c++)
        if (((s = e.gridState.cells[i.y + a]) == null ? void 0 : s[i.x + c]) !== null)
          return !1;
    return !0;
  }
  function Z(e, t, i) {
    const n = e.config;
    for (const r of n.rules) {
      const s = {
        id: e.id + "-test",
        config: r,
        items: /* @__PURE__ */ new Map(),
        lockedItems: new Set(e.lockedItems)
      };
      e.gridState && (s.gridState = {
        width: e.gridState.width,
        height: e.gridState.height,
        cells: e.gridState.cells.map((c) => [...c])
      }), e.slotState && (s.slotState = e.slotState);
      for (const [c, l] of e.items)
        s.items.set(
          c,
          l.map((f) => ({ ...f }))
        );
      h.set(s.id, s);
      const a = v(s.id, t, i);
      if (h.delete(s.id), !a.success)
        return S("containerFull", {
          containerId: e.id,
          itemId: t,
          overflow: i
        }), {
          success: !1,
          added: a.added,
          overflow: a.overflow,
          reason: a.reason ?? "rule_failed"
        };
    }
    const o = n.rules[0];
    return o ? H(e, o, t, i) : { success: !1, added: 0, overflow: i, reason: "no_rules" };
  }
  function H(e, t, i, n) {
    const o = e.config;
    e.config = t;
    const r = v(e.id, i, n);
    return e.config = o, r;
  }
  function F(e, t, i, n = 1) {
    const o = g(e);
    if (o.config.mode !== "grid")
      throw new d("addItemAt only works with grid containers");
    return N(o, t, n, i);
  }
  function O(e, t, i) {
    if (i === 0) return 0;
    const n = g(e);
    if (n.lockedItems.has(t))
      throw new d(`Item "${t}" is locked and cannot be removed`);
    const o = n.items.get(t);
    if (!o || o.length === 0) return 0;
    let r = i, s = 0;
    for (let a = o.length - 1; a >= 0 && r > 0; a--) {
      const c = o[a];
      if (!c) continue;
      const l = Math.min(c.quantity, r);
      c.quantity -= l, r -= l, s += l, c.quantity === 0 && (n.gridState && c.position && J(n, c.position, t), o.splice(a, 1), n.gridState && b(n, t));
    }
    return o.length === 0 && n.items.delete(t), s > 0 && S("itemRemoved", {
      containerId: n.id,
      itemId: t,
      quantity: s,
      newTotal: k(n, t)
    }), s;
  }
  function J(e, t, i) {
    if (!e.gridState) return;
    const n = x(i), { width: o, height: r } = t.rotated ? { width: n.height, height: n.width } : n;
    for (let s = 0; s < r; s++)
      for (let a = 0; a < o; a++) {
        const c = t.y + s, l = t.x + a, f = e.gridState.cells[c];
        f != null && f[l] && (f[l] = null);
      }
  }
  function b(e, t) {
    if (!e.gridState) return;
    const i = e.items.get(t);
    if (!i) return;
    const n = /* @__PURE__ */ new Map();
    i.forEach((o, r) => {
      if (o.position) {
        const s = `${o.position.x},${o.position.y}`;
        n.set(s, r);
      }
    });
    for (let o = 0; o < e.gridState.cells.length; o++) {
      const r = e.gridState.cells[o];
      if (r)
        for (let s = 0; s < r.length; s++) {
          const a = r[s];
          if (a && a.itemId === t && a.isOrigin) {
            const c = `${s},${o}`, l = n.get(c);
            l !== void 0 && (a.stackIndex = l);
          }
        }
    }
  }
  function tt(e, t, i, n) {
    if (n === 0) return { transferred: 0, overflow: 0 };
    const o = g(e);
    if (o.lockedItems.has(i))
      throw new d(`Item "${i}" is locked and cannot be transferred`);
    const r = k(o, i), s = Math.min(r, n);
    if (s === 0)
      return { transferred: 0, overflow: n };
    const a = v(t, i, s);
    return a.added > 0 && (O(e, i, a.added), S("itemTransferred", {
      from: e,
      to: t,
      itemId: i,
      quantity: a.added
    })), {
      transferred: a.added,
      overflow: n - a.added
    };
  }
  function $(e, t) {
    const i = g(e), n = [];
    for (const [o, r] of i.items) {
      const s = r.reduce((l, f) => l + f.quantity, 0), a = r[0], c = {
        itemId: o,
        quantity: s
      };
      a != null && a.position && (c.position = a.position), n.push(c);
    }
    if (t != null && t.deep) {
      const o = [...n];
      for (const r of o)
        if (h.has(r.itemId)) {
          const s = $(r.itemId, { deep: !0 });
          n.push(...s);
        }
    }
    return n;
  }
  function et(e, t) {
    const n = g(e).items.get(t);
    return n ? n.map((o) => ({ ...o })) : [];
  }
  function nt(e, t) {
    return g(e).items.has(t);
  }
  function it(e, t) {
    const i = g(e);
    return k(i, t);
  }
  function k(e, t) {
    const i = e.items.get(t);
    return i ? i.reduce((n, o) => n + o.quantity, 0) : 0;
  }
  function ot(e, t, i) {
    const n = g(e), o = n.config;
    if (o.mode === "unlimited")
      return { canAdd: !0, maxAddable: 1 / 0 };
    if (o.mode === "count") {
      const r = Array.from(n.items.values()).reduce(
        (u, m) => u + m.length,
        0
      ), s = o.maxCount - r, a = o.allowStacking ? Math.min(o.maxStackSize ?? 1 / 0, p(t)) : 1, c = n.items.get(t) ?? [];
      let l = 0;
      for (const u of c)
        l += Math.max(0, a - u.quantity);
      const f = l + s * a;
      return f === 0 ? { canAdd: !1, maxAddable: 0, reason: "count_exceeded" } : { canAdd: !0, maxAddable: f };
    }
    if (o.mode === "weight") {
      const r = A(t), s = M(n), a = o.maxWeight - s, c = Math.floor(a / r);
      return c === 0 ? { canAdd: !1, maxAddable: 0, reason: "weight_exceeded" } : { canAdd: !0, maxAddable: c };
    }
    if (o.mode === "grid") {
      const r = z(e, t);
      return r.length === 0 ? { canAdd: !1, maxAddable: 0, reason: "no_space" } : { canAdd: !0, maxAddable: r.length };
    }
    return { canAdd: !1, maxAddable: 0, reason: "unsupported_mode" };
  }
  function st(e, t) {
    const i = [], n = /* @__PURE__ */ new Set();
    function o(r) {
      if (n.has(r)) return;
      n.add(r);
      const s = h.get(r);
      if (!s) return;
      const a = k(s, e);
      if (a > 0 && i.push({
        containerId: s.id,
        quantity: a
      }), t != null && t.deep)
        for (const [c] of s.items)
          h.has(c) && o(c);
    }
    for (const r of h.values())
      o(r.id);
    return i;
  }
  function T(e, t) {
    const i = g(e);
    if (!(t != null && t.deep))
      return M(i);
    let n = 0;
    for (const [o, r] of i.items) {
      const s = r.reduce((a, c) => a + c.quantity, 0);
      if (h.has(o)) {
        const a = T(o, { deep: !0 }), c = A(o);
        n += (c + a) * s;
      } else {
        const a = A(o);
        n += a * s;
      }
    }
    return n;
  }
  function M(e) {
    let t = 0;
    for (const [i, n] of e.items) {
      const o = A(i), r = n.reduce((s, a) => s + a.quantity, 0);
      t += o * r;
    }
    return t;
  }
  function rt(e) {
    const t = g(e), i = t.config;
    if (i.mode === "unlimited")
      return { type: "unlimited" };
    if (i.mode === "count") {
      const n = Array.from(t.items.values()).reduce(
        (o, r) => o + r.length,
        0
      );
      return { type: "count", remaining: i.maxCount - n };
    }
    if (i.mode === "weight") {
      const n = M(t);
      return { type: "weight", remaining: i.maxWeight - n };
    }
    if (i.mode === "grid" && t.gridState) {
      let n = 0;
      for (const r of t.gridState.cells)
        for (const s of r)
          s !== null && n++;
      return { type: "cells", remaining: i.width * i.height - n };
    }
    if (i.mode === "slots" && t.slotState) {
      const n = [];
      for (const [o, r] of t.slotState.slots)
        r === null && n.push(o);
      return { type: "slots", empty: n };
    }
    return { type: "unlimited" };
  }
  function at(e) {
    return g(e).items.size === 0;
  }
  function ct(e) {
    var n;
    const t = g(e);
    if (!t.gridState)
      throw new d("Container is not in grid mode");
    const i = [];
    for (let o = 0; o < t.gridState.height; o++) {
      const r = [];
      for (let s = 0; s < t.gridState.width; s++) {
        const a = (n = t.gridState.cells[o]) == null ? void 0 : n[s];
        if (a == null)
          r.push(null);
        else {
          const c = t.items.get(a.itemId), l = c == null ? void 0 : c[a.stackIndex];
          r.push({
            itemId: a.itemId,
            quantity: (l == null ? void 0 : l.quantity) ?? 0,
            isOrigin: a.isOrigin
          });
        }
      }
      i.push(r);
    }
    return i;
  }
  function z(e, t) {
    const i = g(e);
    if (!i.gridState)
      return [];
    const n = i.config, o = x(t), r = [];
    for (let s = 0; s <= i.gridState.height - o.height; s++)
      for (let a = 0; a <= i.gridState.width - o.width; a++)
        E(i, t, { x: a, y: s, rotated: !1 }) && r.push({ x: a, y: s, rotated: !1 });
    if (n.allowRotation && o.width !== o.height)
      for (let s = 0; s <= i.gridState.height - o.width; s++)
        for (let a = 0; a <= i.gridState.width - o.height; a++)
          E(i, t, { x: a, y: s, rotated: !0 }) && r.push({ x: a, y: s, rotated: !0 });
    return r;
  }
  function D(e, t, i) {
    var a;
    const n = g(e);
    if (!n.slotState)
      throw new d("Container is not in slots mode");
    if (!n.slotState.slots.has(t))
      throw new d(`Slot "${t}" does not exist`);
    const r = (a = n.config.slotFilters) == null ? void 0 : a[t];
    if (i !== null && r && !r(i))
      throw new d(`Item "${i}" cannot be equipped in slot "${t}"`);
    const s = n.slotState.slots.get(t) ?? null;
    return n.slotState.slots.set(t, i), S("slotChanged", {
      containerId: n.id,
      slot: t,
      oldItem: s,
      newItem: i
    }), s;
  }
  function dt(e, t) {
    const i = g(e);
    if (!i.slotState)
      throw new d("Container is not in slots mode");
    return i.slotState.slots.get(t) ?? null;
  }
  function lt(e) {
    const t = g(e);
    if (!t.slotState)
      throw new d("Container is not in slots mode");
    const i = ["__proto__", "constructor", "prototype"], n = {};
    for (const [o, r] of t.slotState.slots)
      i.includes(o) || (n[o] = r);
    return n;
  }
  function ft(e, t) {
    D(e, t, null);
  }
  function ut(e, t, i) {
    var s;
    const n = g(e);
    if (!n.slotState)
      return { canAdd: !1, maxAddable: 0, reason: "not_slots_container" };
    const o = n.config;
    if (!n.slotState.slots.has(t))
      return { canAdd: !1, maxAddable: 0, reason: "slot_not_found" };
    const r = (s = o.slotFilters) == null ? void 0 : s[t];
    return r && !r(i) ? { canAdd: !1, maxAddable: 0, reason: "slot_filter_failed" } : { canAdd: !0, maxAddable: 1 };
  }
  function gt(e, t, i, n) {
    const o = g(e), r = o.items.get(t);
    if (!r)
      throw new d("Stack not found");
    const s = r[i];
    if (!s)
      throw new d("Stack not found");
    if (s.quantity < n)
      throw new d("Insufficient quantity in stack");
    s.quantity -= n, r.push({ itemId: t, quantity: n }), b(o, t);
  }
  function ht(e, t, i, n) {
    const o = g(e), r = o.items.get(t);
    if (!r || r.length === 0)
      throw new d(`No stacks found for item "${t}"`);
    if (i < 0 || i >= r.length)
      throw new d(`Invalid fromIndex: ${String(i)}`);
    if (n < 0 || n >= r.length)
      throw new d(`Invalid toIndex: ${String(n)}`);
    const s = r[i], a = r[n];
    if (!s || !a)
      throw new d("Stack not found");
    if (s.itemId !== a.itemId)
      throw new d("Cannot merge different items");
    const c = o.config, f = ("maxStackSize" in c ? c.maxStackSize ?? 1 / 0 : 1 / 0) - a.quantity, u = Math.min(f, s.quantity);
    a.quantity += u, s.quantity -= u, s.quantity === 0 && (r.splice(i, 1), b(o, t));
  }
  function mt(e) {
    const t = g(e);
    if (t.config.mode === "grid")
      throw new d("Use autoArrange() for grid containers");
    const i = t.config, n = "maxStackSize" in i ? i.maxStackSize ?? 1 / 0 : 1 / 0;
    for (const [o, r] of t.items) {
      const s = Math.min(n, p(o)), a = [];
      let c = null;
      for (const f of r) {
        let u = f.quantity;
        for (; u > 0; ) {
          if (!c || c.quantity >= s) {
            const I = { itemId: o, quantity: 0 };
            f.position && (I.position = f.position), c = I, a.push(c);
          }
          const m = s - c.quantity, y = Math.min(m, u);
          c.quantity += y, u -= y;
        }
      }
      const l = a.filter((f) => f.quantity > 0);
      l.length > 0 ? (t.items.set(o, l), b(t, o)) : t.items.delete(o);
    }
  }
  function j(e, t) {
    g(e).lockedItems.add(t);
  }
  function wt(e, t) {
    g(e).lockedItems.delete(t);
  }
  function St(e) {
    _ = X();
    try {
      e(), _ = null;
    } catch (t) {
      throw P(_), _ = null, t;
    }
  }
  function yt(e, t) {
    const i = g(e);
    if (i.config.mode === "grid")
      throw new d("Use autoArrange() for grid containers");
    const n = $(e);
    n.sort(t);
    const o = /* @__PURE__ */ new Map();
    for (const r of n) {
      const s = i.items.get(r.itemId) ?? [];
      o.set(r.itemId, s);
    }
    i.items = o;
  }
  function kt(e) {
    const t = g(e);
    if (t.config.mode !== "grid")
      throw new d("autoArrange() only works with grid containers");
    const i = {
      items: new Map(
        Array.from(t.items.entries()).map(([n, o]) => [
          n,
          o.map((r) => ({
            ...r,
            position: r.position ? { ...r.position } : void 0
          }))
        ])
      ),
      gridCells: t.gridState ? t.gridState.cells.map((n) => n.map((o) => o ? { ...o } : null)) : void 0
    };
    try {
      const n = [];
      for (const [o, r] of t.items)
        for (const s of r)
          n.push({ itemId: o, quantity: s.quantity });
      if (t.items.clear(), t.gridState)
        for (let o = 0; o < t.gridState.height; o++) {
          const r = t.gridState.cells[o];
          if (r)
            for (let s = 0; s < t.gridState.width; s++)
              r[s] = null;
        }
      for (const o of n) {
        const r = v(e, o.itemId, o.quantity);
        if (r.overflow > 0)
          throw new Error(
            `Cannot fit item ${o.itemId}: ${r.overflow} items would overflow`
          );
      }
    } catch (n) {
      t.items = i.items, i.gridCells && t.gridState && (t.gridState.cells = i.gridCells);
      const o = n instanceof Error ? n.message : String(n);
      throw new Error(`autoArrange failed: ${o}`);
    }
  }
  function vt(e, t) {
    const i = C[e];
    return i.push(t), () => {
      const n = i.indexOf(t);
      n !== -1 && i.splice(n, 1);
    };
  }
  function S(e, t) {
    const i = C[e];
    for (const n of i)
      n(t);
  }
  function X() {
    const e = [];
    for (const t of h.values())
      e.push({
        id: t.id,
        config: t.config,
        items: Array.from(t.items.entries()).map(([i, n]) => ({
          itemId: i,
          stacks: n.map((o) => ({
            quantity: o.quantity,
            position: o.position
          }))
        })),
        lockedItems: Array.from(t.lockedItems),
        slotState: t.slotState ? {
          slots: Array.from(t.slotState.slots.entries())
        } : void 0
      });
    return { containers: e };
  }
  function P(e) {
    if (!e || typeof e != "object")
      throw new d("Invalid serialized data: must be an object");
    const t = e;
    if (!Array.isArray(t.containers))
      throw new d("Invalid serialized data: containers must be an array");
    const i = ["__proto__", "constructor", "prototype"];
    h.clear();
    for (const n of t.containers) {
      if (!n || typeof n != "object")
        throw new d("Invalid container data in serialized data");
      if (typeof n.id != "string" || i.includes(n.id))
        throw new d("Invalid or dangerous container ID in serialized data");
      if (!n.config || typeof n.config != "object")
        throw new d("Invalid container config in serialized data");
      L(n.id, n.config);
      const o = g(n.id);
      if (Array.isArray(n.items))
        for (const r of n.items) {
          if (!r || typeof r != "object")
            throw new d("Invalid item data in serialized data");
          if (typeof r.itemId != "string" || i.includes(r.itemId))
            throw new d("Invalid or dangerous item ID in serialized data");
          if (!Array.isArray(r.stacks))
            throw new d("Invalid stacks data in serialized data");
          for (const s of r.stacks) {
            if (!s || typeof s != "object")
              throw new d("Invalid stack data in serialized data");
            if (typeof s.quantity != "number" || s.quantity < 0)
              throw new d("Invalid stack quantity in serialized data");
            s.position ? F(o.id, r.itemId, s.position, s.quantity) : v(o.id, r.itemId, s.quantity);
          }
        }
      if (Array.isArray(n.lockedItems))
        for (const r of n.lockedItems) {
          if (typeof r != "string" || i.includes(r))
            throw new d("Invalid or dangerous locked item ID in serialized data");
          j(o.id, r);
        }
      if (n.slotState && typeof n.slotState == "object" && Array.isArray(n.slotState.slots))
        for (const r of n.slotState.slots) {
          if (!Array.isArray(r) || r.length !== 2)
            throw new d("Invalid slot entry in serialized data");
          const [s, a] = r;
          if (typeof s != "string" || i.includes(s))
            throw new d("Invalid or dangerous slot name in serialized data");
          if (a !== null) {
            if (typeof a != "string" || i.includes(a))
              throw new d("Invalid or dangerous item ID in slot data");
            D(o.id, s, a);
          }
        }
    }
  }
  function pt(e) {
    const t = g(e);
    return {
      id: t.id,
      config: t.config,
      items: Array.from(t.items.entries()).map(([i, n]) => ({
        itemId: i,
        stacks: n.map((o) => ({
          quantity: o.quantity,
          position: o.position
        }))
      })),
      lockedItems: Array.from(t.lockedItems)
    };
  }
  return {
    createContainer: L,
    removeContainer: B,
    listContainers: K,
    addItem: v,
    addItemAt: F,
    removeItem: O,
    transfer: tt,
    getContents: $,
    getStacks: et,
    hasItem: nt,
    getQuantity: it,
    canAdd: ot,
    findItem: st,
    getTotalWeight: T,
    getRemainingCapacity: rt,
    isEmpty: at,
    getGrid: ct,
    findPlacements: z,
    setSlot: D,
    getSlot: dt,
    getAllSlots: lt,
    clearSlot: ft,
    canEquip: ut,
    splitStack: gt,
    mergeStacks: ht,
    consolidate: mt,
    lockItem: j,
    unlockItem: wt,
    transaction: St,
    sort: yt,
    autoArrange: kt,
    on: vt,
    serialize: X,
    deserialize: P,
    serializeContainer: pt
  };
}
export {
  At as InventoryError,
  d as ValidationError,
  xt as createInventoryManager
};
