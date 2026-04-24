import U, { useState as L, useRef as Ke, useEffect as Ce } from "react";
var ft = { exports: {} }, We = {};
/**
 * @license React
 * react-jsx-runtime.production.min.js
 *
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
var Rt;
function fn() {
  if (Rt) return We;
  Rt = 1;
  var l = U, i = Symbol.for("react.element"), c = Symbol.for("react.fragment"), h = Object.prototype.hasOwnProperty, g = l.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED.ReactCurrentOwner, a = { key: !0, ref: !0, __self: !0, __source: !0 };
  function k(p, n, s) {
    var o, d = {}, u = null, x = null;
    s !== void 0 && (u = "" + s), n.key !== void 0 && (u = "" + n.key), n.ref !== void 0 && (x = n.ref);
    for (o in n) h.call(n, o) && !a.hasOwnProperty(o) && (d[o] = n[o]);
    if (p && p.defaultProps) for (o in n = p.defaultProps, n) d[o] === void 0 && (d[o] = n[o]);
    return { $$typeof: i, type: p, key: u, ref: x, props: d, _owner: g.current };
  }
  return We.Fragment = c, We.jsx = k, We.jsxs = k, We;
}
var Ue = {};
/**
 * @license React
 * react-jsx-runtime.development.js
 *
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
var Tt;
function pn() {
  return Tt || (Tt = 1, process.env.NODE_ENV !== "production" && function() {
    var l = U, i = Symbol.for("react.element"), c = Symbol.for("react.portal"), h = Symbol.for("react.fragment"), g = Symbol.for("react.strict_mode"), a = Symbol.for("react.profiler"), k = Symbol.for("react.provider"), p = Symbol.for("react.context"), n = Symbol.for("react.forward_ref"), s = Symbol.for("react.suspense"), o = Symbol.for("react.suspense_list"), d = Symbol.for("react.memo"), u = Symbol.for("react.lazy"), x = Symbol.for("react.offscreen"), y = Symbol.iterator, b = "@@iterator";
    function m(t) {
      if (t === null || typeof t != "object")
        return null;
      var f = y && t[y] || t[b];
      return typeof f == "function" ? f : null;
    }
    var E = l.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED;
    function v(t) {
      {
        for (var f = arguments.length, w = new Array(f > 1 ? f - 1 : 0), A = 1; A < f; A++)
          w[A - 1] = arguments[A];
        S("error", t, w);
      }
    }
    function S(t, f, w) {
      {
        var A = E.ReactDebugCurrentFrame, M = A.getStackAddendum();
        M !== "" && (f += "%s", w = w.concat([M]));
        var O = w.map(function(B) {
          return String(B);
        });
        O.unshift("Warning: " + f), Function.prototype.apply.call(console[t], console, O);
      }
    }
    var I = !1, P = !1, X = !1, de = !1, J = !1, re;
    re = Symbol.for("react.module.reference");
    function ee(t) {
      return !!(typeof t == "string" || typeof t == "function" || t === h || t === a || J || t === g || t === s || t === o || de || t === x || I || P || X || typeof t == "object" && t !== null && (t.$$typeof === u || t.$$typeof === d || t.$$typeof === k || t.$$typeof === p || t.$$typeof === n || // This needs to include all possible module reference object
      // types supported by any Flight configuration anywhere since
      // we don't know which Flight build this will end up being used
      // with.
      t.$$typeof === re || t.getModuleId !== void 0));
    }
    function V(t, f, w) {
      var A = t.displayName;
      if (A)
        return A;
      var M = f.displayName || f.name || "";
      return M !== "" ? w + "(" + M + ")" : w;
    }
    function T(t) {
      return t.displayName || "Context";
    }
    function z(t) {
      if (t == null)
        return null;
      if (typeof t.tag == "number" && v("Received an unexpected object in getComponentNameFromType(). This is likely a bug in React. Please file an issue."), typeof t == "function")
        return t.displayName || t.name || null;
      if (typeof t == "string")
        return t;
      switch (t) {
        case h:
          return "Fragment";
        case c:
          return "Portal";
        case a:
          return "Profiler";
        case g:
          return "StrictMode";
        case s:
          return "Suspense";
        case o:
          return "SuspenseList";
      }
      if (typeof t == "object")
        switch (t.$$typeof) {
          case p:
            var f = t;
            return T(f) + ".Consumer";
          case k:
            var w = t;
            return T(w._context) + ".Provider";
          case n:
            return V(t, t.render, "ForwardRef");
          case d:
            var A = t.displayName || null;
            return A !== null ? A : z(t.type) || "Memo";
          case u: {
            var M = t, O = M._payload, B = M._init;
            try {
              return z(B(O));
            } catch {
              return null;
            }
          }
        }
      return null;
    }
    var N = Object.assign, H = 0, ge, se, ue, oe, me, ye, he;
    function ve() {
    }
    ve.__reactDisabledLog = !0;
    function C() {
      {
        if (H === 0) {
          ge = console.log, se = console.info, ue = console.warn, oe = console.error, me = console.group, ye = console.groupCollapsed, he = console.groupEnd;
          var t = {
            configurable: !0,
            enumerable: !0,
            value: ve,
            writable: !0
          };
          Object.defineProperties(console, {
            info: t,
            log: t,
            warn: t,
            error: t,
            group: t,
            groupCollapsed: t,
            groupEnd: t
          });
        }
        H++;
      }
    }
    function G() {
      {
        if (H--, H === 0) {
          var t = {
            configurable: !0,
            enumerable: !0,
            writable: !0
          };
          Object.defineProperties(console, {
            log: N({}, t, {
              value: ge
            }),
            info: N({}, t, {
              value: se
            }),
            warn: N({}, t, {
              value: ue
            }),
            error: N({}, t, {
              value: oe
            }),
            group: N({}, t, {
              value: me
            }),
            groupCollapsed: N({}, t, {
              value: ye
            }),
            groupEnd: N({}, t, {
              value: he
            })
          });
        }
        H < 0 && v("disabledDepth fell below zero. This is a bug in React. Please file an issue.");
      }
    }
    var be = E.ReactCurrentDispatcher, fe;
    function te(t, f, w) {
      {
        if (fe === void 0)
          try {
            throw Error();
          } catch (M) {
            var A = M.stack.trim().match(/\n( *(at )?)/);
            fe = A && A[1] || "";
          }
        return `
` + fe + t;
      }
    }
    var Se = !1, ae;
    {
      var je = typeof WeakMap == "function" ? WeakMap : Map;
      ae = new je();
    }
    function xe(t, f) {
      if (!t || Se)
        return "";
      {
        var w = ae.get(t);
        if (w !== void 0)
          return w;
      }
      var A;
      Se = !0;
      var M = Error.prepareStackTrace;
      Error.prepareStackTrace = void 0;
      var O;
      O = be.current, be.current = null, C();
      try {
        if (f) {
          var B = function() {
            throw Error();
          };
          if (Object.defineProperty(B.prototype, "props", {
            set: function() {
              throw Error();
            }
          }), typeof Reflect == "object" && Reflect.construct) {
            try {
              Reflect.construct(B, []);
            } catch (ne) {
              A = ne;
            }
            Reflect.construct(t, [], B);
          } else {
            try {
              B.call();
            } catch (ne) {
              A = ne;
            }
            t.call(B.prototype);
          }
        } else {
          try {
            throw Error();
          } catch (ne) {
            A = ne;
          }
          t();
        }
      } catch (ne) {
        if (ne && A && typeof ne.stack == "string") {
          for (var F = ne.stack.split(`
`), Z = A.stack.split(`
`), W = F.length - 1, $ = Z.length - 1; W >= 1 && $ >= 0 && F[W] !== Z[$]; )
            $--;
          for (; W >= 1 && $ >= 0; W--, $--)
            if (F[W] !== Z[$]) {
              if (W !== 1 || $ !== 1)
                do
                  if (W--, $--, $ < 0 || F[W] !== Z[$]) {
                    var ce = `
` + F[W].replace(" at new ", " at ");
                    return t.displayName && ce.includes("<anonymous>") && (ce = ce.replace("<anonymous>", t.displayName)), typeof t == "function" && ae.set(t, ce), ce;
                  }
                while (W >= 1 && $ >= 0);
              break;
            }
        }
      } finally {
        Se = !1, be.current = O, G(), Error.prepareStackTrace = M;
      }
      var De = t ? t.displayName || t.name : "", Te = De ? te(De) : "";
      return typeof t == "function" && ae.set(t, Te), Te;
    }
    function Je(t, f, w) {
      return xe(t, !1);
    }
    function et(t) {
      var f = t.prototype;
      return !!(f && f.isReactComponent);
    }
    function Be(t, f, w) {
      if (t == null)
        return "";
      if (typeof t == "function")
        return xe(t, et(t));
      if (typeof t == "string")
        return te(t);
      switch (t) {
        case s:
          return te("Suspense");
        case o:
          return te("SuspenseList");
      }
      if (typeof t == "object")
        switch (t.$$typeof) {
          case n:
            return Je(t.render);
          case d:
            return Be(t.type, f, w);
          case u: {
            var A = t, M = A._payload, O = A._init;
            try {
              return Be(O(M), f, w);
            } catch {
            }
          }
        }
      return "";
    }
    var le = Object.prototype.hasOwnProperty, He = {}, Ge = E.ReactDebugCurrentFrame;
    function Ee(t) {
      if (t) {
        var f = t._owner, w = Be(t.type, t._source, f ? f.type : null);
        Ge.setExtraStackFrame(w);
      } else
        Ge.setExtraStackFrame(null);
    }
    function ze(t, f, w, A, M) {
      {
        var O = Function.call.bind(le);
        for (var B in t)
          if (O(t, B)) {
            var F = void 0;
            try {
              if (typeof t[B] != "function") {
                var Z = Error((A || "React class") + ": " + w + " type `" + B + "` is invalid; it must be a function, usually from the `prop-types` package, but received `" + typeof t[B] + "`.This often happens because of typos such as `PropTypes.function` instead of `PropTypes.func`.");
                throw Z.name = "Invariant Violation", Z;
              }
              F = t[B](f, B, A, w, null, "SECRET_DO_NOT_PASS_THIS_OR_YOU_WILL_BE_FIRED");
            } catch (W) {
              F = W;
            }
            F && !(F instanceof Error) && (Ee(M), v("%s: type specification of %s `%s` is invalid; the type checker function must return `null` or an `Error` but returned a %s. You may have forgotten to pass an argument to the type checker creator (arrayOf, instanceOf, objectOf, oneOf, oneOfType, and shape all require an argument).", A || "React class", w, B, typeof F), Ee(null)), F instanceof Error && !(F.message in He) && (He[F.message] = !0, Ee(M), v("Failed %s type: %s", w, F.message), Ee(null));
          }
      }
    }
    var Le = Array.isArray;
    function _e(t) {
      return Le(t);
    }
    function tt(t) {
      {
        var f = typeof Symbol == "function" && Symbol.toStringTag, w = f && t[Symbol.toStringTag] || t.constructor.name || "Object";
        return w;
      }
    }
    function nt(t) {
      try {
        return D(t), !1;
      } catch {
        return !0;
      }
    }
    function D(t) {
      return "" + t;
    }
    function K(t) {
      if (nt(t))
        return v("The provided key is an unsupported type %s. This value must be coerced to a string before before using it here.", tt(t)), D(t);
    }
    var q = E.ReactCurrentOwner, Ie = {
      key: !0,
      ref: !0,
      __self: !0,
      __source: !0
    }, we, Re;
    function bt(t) {
      if (le.call(t, "ref")) {
        var f = Object.getOwnPropertyDescriptor(t, "ref").get;
        if (f && f.isReactWarning)
          return !1;
      }
      return t.ref !== void 0;
    }
    function wt(t) {
      if (le.call(t, "key")) {
        var f = Object.getOwnPropertyDescriptor(t, "key").get;
        if (f && f.isReactWarning)
          return !1;
      }
      return t.key !== void 0;
    }
    function ke(t, f) {
      typeof t.ref == "string" && q.current;
    }
    function Zt(t, f) {
      {
        var w = function() {
          we || (we = !0, v("%s: `key` is not a prop. Trying to access it will result in `undefined` being returned. If you need to access the same value within the child component, you should pass it as a different prop. (https://reactjs.org/link/special-props)", f));
        };
        w.isReactWarning = !0, Object.defineProperty(t, "key", {
          get: w,
          configurable: !0
        });
      }
    }
    function Jt(t, f) {
      {
        var w = function() {
          Re || (Re = !0, v("%s: `ref` is not a prop. Trying to access it will result in `undefined` being returned. If you need to access the same value within the child component, you should pass it as a different prop. (https://reactjs.org/link/special-props)", f));
        };
        w.isReactWarning = !0, Object.defineProperty(t, "ref", {
          get: w,
          configurable: !0
        });
      }
    }
    var en = function(t, f, w, A, M, O, B) {
      var F = {
        // This tag allows us to uniquely identify this as a React Element
        $$typeof: i,
        // Built-in properties that belong on the element
        type: t,
        key: f,
        ref: w,
        props: B,
        // Record the component responsible for creating this element.
        _owner: O
      };
      return F._store = {}, Object.defineProperty(F._store, "validated", {
        configurable: !1,
        enumerable: !1,
        writable: !0,
        value: !1
      }), Object.defineProperty(F, "_self", {
        configurable: !1,
        enumerable: !1,
        writable: !1,
        value: A
      }), Object.defineProperty(F, "_source", {
        configurable: !1,
        enumerable: !1,
        writable: !1,
        value: M
      }), Object.freeze && (Object.freeze(F.props), Object.freeze(F)), F;
    };
    function tn(t, f, w, A, M) {
      {
        var O, B = {}, F = null, Z = null;
        w !== void 0 && (K(w), F = "" + w), wt(f) && (K(f.key), F = "" + f.key), bt(f) && (Z = f.ref, ke(f, M));
        for (O in f)
          le.call(f, O) && !Ie.hasOwnProperty(O) && (B[O] = f[O]);
        if (t && t.defaultProps) {
          var W = t.defaultProps;
          for (O in W)
            B[O] === void 0 && (B[O] = W[O]);
        }
        if (F || Z) {
          var $ = typeof t == "function" ? t.displayName || t.name || "Unknown" : t;
          F && Zt(B, $), Z && Jt(B, $);
        }
        return en(t, F, Z, M, A, q.current, B);
      }
    }
    var rt = E.ReactCurrentOwner, kt = E.ReactDebugCurrentFrame;
    function Me(t) {
      if (t) {
        var f = t._owner, w = Be(t.type, t._source, f ? f.type : null);
        kt.setExtraStackFrame(w);
      } else
        kt.setExtraStackFrame(null);
    }
    var ot;
    ot = !1;
    function it(t) {
      return typeof t == "object" && t !== null && t.$$typeof === i;
    }
    function vt() {
      {
        if (rt.current) {
          var t = z(rt.current.type);
          if (t)
            return `

Check the render method of \`` + t + "`.";
        }
        return "";
      }
    }
    function nn(t) {
      return "";
    }
    var St = {};
    function rn(t) {
      {
        var f = vt();
        if (!f) {
          var w = typeof t == "string" ? t : t.displayName || t.name;
          w && (f = `

Check the top-level render call using <` + w + ">.");
        }
        return f;
      }
    }
    function jt(t, f) {
      {
        if (!t._store || t._store.validated || t.key != null)
          return;
        t._store.validated = !0;
        var w = rn(f);
        if (St[w])
          return;
        St[w] = !0;
        var A = "";
        t && t._owner && t._owner !== rt.current && (A = " It was passed a child from " + z(t._owner.type) + "."), Me(t), v('Each child in a list should have a unique "key" prop.%s%s See https://reactjs.org/link/warning-keys for more information.', w, A), Me(null);
      }
    }
    function Et(t, f) {
      {
        if (typeof t != "object")
          return;
        if (_e(t))
          for (var w = 0; w < t.length; w++) {
            var A = t[w];
            it(A) && jt(A, f);
          }
        else if (it(t))
          t._store && (t._store.validated = !0);
        else if (t) {
          var M = m(t);
          if (typeof M == "function" && M !== t.entries)
            for (var O = M.call(t), B; !(B = O.next()).done; )
              it(B.value) && jt(B.value, f);
        }
      }
    }
    function on(t) {
      {
        var f = t.type;
        if (f == null || typeof f == "string")
          return;
        var w;
        if (typeof f == "function")
          w = f.propTypes;
        else if (typeof f == "object" && (f.$$typeof === n || // Note: Memo only checks outer props here.
        // Inner props are checked in the reconciler.
        f.$$typeof === d))
          w = f.propTypes;
        else
          return;
        if (w) {
          var A = z(f);
          ze(w, t.props, "prop", A, t);
        } else if (f.PropTypes !== void 0 && !ot) {
          ot = !0;
          var M = z(f);
          v("Component %s declared `PropTypes` instead of `propTypes`. Did you misspell the property assignment?", M || "Unknown");
        }
        typeof f.getDefaultProps == "function" && !f.getDefaultProps.isReactClassApproved && v("getDefaultProps is only used on classic React.createClass definitions. Use a static property named `defaultProps` instead.");
      }
    }
    function sn(t) {
      {
        for (var f = Object.keys(t.props), w = 0; w < f.length; w++) {
          var A = f[w];
          if (A !== "children" && A !== "key") {
            Me(t), v("Invalid prop `%s` supplied to `React.Fragment`. React.Fragment can only have `key` and `children` props.", A), Me(null);
            break;
          }
        }
        t.ref !== null && (Me(t), v("Invalid attribute `ref` supplied to `React.Fragment`."), Me(null));
      }
    }
    var Ct = {};
    function At(t, f, w, A, M, O) {
      {
        var B = ee(t);
        if (!B) {
          var F = "";
          (t === void 0 || typeof t == "object" && t !== null && Object.keys(t).length === 0) && (F += " You likely forgot to export your component from the file it's defined in, or you might have mixed up default and named imports.");
          var Z = nn();
          Z ? F += Z : F += vt();
          var W;
          t === null ? W = "null" : _e(t) ? W = "array" : t !== void 0 && t.$$typeof === i ? (W = "<" + (z(t.type) || "Unknown") + " />", F = " Did you accidentally export a JSX literal instead of a component?") : W = typeof t, v("React.jsx: type is invalid -- expected a string (for built-in components) or a class/function (for composite components) but got: %s.%s", W, F);
        }
        var $ = tn(t, f, w, M, O);
        if ($ == null)
          return $;
        if (B) {
          var ce = f.children;
          if (ce !== void 0)
            if (A)
              if (_e(ce)) {
                for (var De = 0; De < ce.length; De++)
                  Et(ce[De], t);
                Object.freeze && Object.freeze(ce);
              } else
                v("React.jsx: Static children should always be an array. You are likely explicitly calling React.jsxs or React.jsxDEV. Use the Babel transform instead.");
            else
              Et(ce, t);
        }
        if (le.call(f, "key")) {
          var Te = z(t), ne = Object.keys(f).filter(function(hn) {
            return hn !== "key";
          }), st = ne.length > 0 ? "{key: someKey, " + ne.join(": ..., ") + ": ...}" : "{key: someKey}";
          if (!Ct[Te + st]) {
            var un = ne.length > 0 ? "{" + ne.join(": ..., ") + ": ...}" : "{}";
            v(`A props object containing a "key" prop is being spread into JSX:
  let props = %s;
  <%s {...props} />
React keys must be passed directly to JSX without using spread:
  let props = %s;
  <%s key={someKey} {...props} />`, st, Te, un, Te), Ct[Te + st] = !0;
          }
        }
        return t === h ? sn($) : on($), $;
      }
    }
    function an(t, f, w) {
      return At(t, f, w, !0);
    }
    function ln(t, f, w) {
      return At(t, f, w, !1);
    }
    var cn = ln, dn = an;
    Ue.Fragment = h, Ue.jsx = cn, Ue.jsxs = dn;
  }()), Ue;
}
process.env.NODE_ENV === "production" ? ft.exports = fn() : ft.exports = pn();
var e = ft.exports, gn = Object.defineProperty, Xe = Object.getOwnPropertySymbols, Nt = Object.prototype.hasOwnProperty, Ot = Object.prototype.propertyIsEnumerable, Ft = (l, i, c) => i in l ? gn(l, i, { enumerable: !0, configurable: !0, writable: !0, value: c }) : l[i] = c, pt = (l, i) => {
  for (var c in i || (i = {}))
    Nt.call(i, c) && Ft(l, c, i[c]);
  if (Xe)
    for (var c of Xe(i))
      Ot.call(i, c) && Ft(l, c, i[c]);
  return l;
}, gt = (l, i) => {
  var c = {};
  for (var h in l)
    Nt.call(l, h) && i.indexOf(h) < 0 && (c[h] = l[h]);
  if (l != null && Xe)
    for (var h of Xe(l))
      i.indexOf(h) < 0 && Ot.call(l, h) && (c[h] = l[h]);
  return c;
};
/**
 * @license QR Code generator library (TypeScript)
 * Copyright (c) Project Nayuki.
 * SPDX-License-Identifier: MIT
 */
var Fe;
((l) => {
  const i = class R {
    /*-- Constructor (low level) and fields --*/
    // Creates a new QR Code with the given version number,
    // error correction level, data codeword bytes, and mask number.
    // This is a low-level API that most users should not use directly.
    // A mid-level API is the encodeSegments() function.
    constructor(n, s, o, d) {
      if (this.version = n, this.errorCorrectionLevel = s, this.modules = [], this.isFunction = [], n < R.MIN_VERSION || n > R.MAX_VERSION)
        throw new RangeError("Version value out of range");
      if (d < -1 || d > 7)
        throw new RangeError("Mask value out of range");
      this.size = n * 4 + 17;
      let u = [];
      for (let y = 0; y < this.size; y++)
        u.push(!1);
      for (let y = 0; y < this.size; y++)
        this.modules.push(u.slice()), this.isFunction.push(u.slice());
      this.drawFunctionPatterns();
      const x = this.addEccAndInterleave(o);
      if (this.drawCodewords(x), d == -1) {
        let y = 1e9;
        for (let b = 0; b < 8; b++) {
          this.applyMask(b), this.drawFormatBits(b);
          const m = this.getPenaltyScore();
          m < y && (d = b, y = m), this.applyMask(b);
        }
      }
      g(0 <= d && d <= 7), this.mask = d, this.applyMask(d), this.drawFormatBits(d), this.isFunction = [];
    }
    /*-- Static factory functions (high level) --*/
    // Returns a QR Code representing the given Unicode text string at the given error correction level.
    // As a conservative upper bound, this function is guaranteed to succeed for strings that have 738 or fewer
    // Unicode code points (not UTF-16 code units) if the low error correction level is used. The smallest possible
    // QR Code version is automatically chosen for the output. The ECC level of the result may be higher than the
    // ecl argument if it can be done without increasing the version.
    static encodeText(n, s) {
      const o = l.QrSegment.makeSegments(n);
      return R.encodeSegments(o, s);
    }
    // Returns a QR Code representing the given binary data at the given error correction level.
    // This function always encodes using the binary segment mode, not any text mode. The maximum number of
    // bytes allowed is 2953. The smallest possible QR Code version is automatically chosen for the output.
    // The ECC level of the result may be higher than the ecl argument if it can be done without increasing the version.
    static encodeBinary(n, s) {
      const o = l.QrSegment.makeBytes(n);
      return R.encodeSegments([o], s);
    }
    /*-- Static factory functions (mid level) --*/
    // Returns a QR Code representing the given segments with the given encoding parameters.
    // The smallest possible QR Code version within the given range is automatically
    // chosen for the output. Iff boostEcl is true, then the ECC level of the result
    // may be higher than the ecl argument if it can be done without increasing the
    // version. The mask number is either between 0 to 7 (inclusive) to force that
    // mask, or -1 to automatically choose an appropriate mask (which may be slow).
    // This function allows the user to create a custom sequence of segments that switches
    // between modes (such as alphanumeric and byte) to encode text in less space.
    // This is a mid-level API; the high-level API is encodeText() and encodeBinary().
    static encodeSegments(n, s, o = 1, d = 40, u = -1, x = !0) {
      if (!(R.MIN_VERSION <= o && o <= d && d <= R.MAX_VERSION) || u < -1 || u > 7)
        throw new RangeError("Invalid value");
      let y, b;
      for (y = o; ; y++) {
        const S = R.getNumDataCodewords(y, s) * 8, I = k.getTotalBits(n, y);
        if (I <= S) {
          b = I;
          break;
        }
        if (y >= d)
          throw new RangeError("Data too long");
      }
      for (const S of [R.Ecc.MEDIUM, R.Ecc.QUARTILE, R.Ecc.HIGH])
        x && b <= R.getNumDataCodewords(y, S) * 8 && (s = S);
      let m = [];
      for (const S of n) {
        c(S.mode.modeBits, 4, m), c(S.numChars, S.mode.numCharCountBits(y), m);
        for (const I of S.getData())
          m.push(I);
      }
      g(m.length == b);
      const E = R.getNumDataCodewords(y, s) * 8;
      g(m.length <= E), c(0, Math.min(4, E - m.length), m), c(0, (8 - m.length % 8) % 8, m), g(m.length % 8 == 0);
      for (let S = 236; m.length < E; S ^= 253)
        c(S, 8, m);
      let v = [];
      for (; v.length * 8 < m.length; )
        v.push(0);
      return m.forEach((S, I) => v[I >>> 3] |= S << 7 - (I & 7)), new R(y, s, v, u);
    }
    /*-- Accessor methods --*/
    // Returns the color of the module (pixel) at the given coordinates, which is false
    // for light or true for dark. The top left corner has the coordinates (x=0, y=0).
    // If the given coordinates are out of bounds, then false (light) is returned.
    getModule(n, s) {
      return 0 <= n && n < this.size && 0 <= s && s < this.size && this.modules[s][n];
    }
    // Modified to expose modules for easy access
    getModules() {
      return this.modules;
    }
    /*-- Private helper methods for constructor: Drawing function modules --*/
    // Reads this object's version field, and draws and marks all function modules.
    drawFunctionPatterns() {
      for (let o = 0; o < this.size; o++)
        this.setFunctionModule(6, o, o % 2 == 0), this.setFunctionModule(o, 6, o % 2 == 0);
      this.drawFinderPattern(3, 3), this.drawFinderPattern(this.size - 4, 3), this.drawFinderPattern(3, this.size - 4);
      const n = this.getAlignmentPatternPositions(), s = n.length;
      for (let o = 0; o < s; o++)
        for (let d = 0; d < s; d++)
          o == 0 && d == 0 || o == 0 && d == s - 1 || o == s - 1 && d == 0 || this.drawAlignmentPattern(n[o], n[d]);
      this.drawFormatBits(0), this.drawVersion();
    }
    // Draws two copies of the format bits (with its own error correction code)
    // based on the given mask and this object's error correction level field.
    drawFormatBits(n) {
      const s = this.errorCorrectionLevel.formatBits << 3 | n;
      let o = s;
      for (let u = 0; u < 10; u++)
        o = o << 1 ^ (o >>> 9) * 1335;
      const d = (s << 10 | o) ^ 21522;
      g(d >>> 15 == 0);
      for (let u = 0; u <= 5; u++)
        this.setFunctionModule(8, u, h(d, u));
      this.setFunctionModule(8, 7, h(d, 6)), this.setFunctionModule(8, 8, h(d, 7)), this.setFunctionModule(7, 8, h(d, 8));
      for (let u = 9; u < 15; u++)
        this.setFunctionModule(14 - u, 8, h(d, u));
      for (let u = 0; u < 8; u++)
        this.setFunctionModule(this.size - 1 - u, 8, h(d, u));
      for (let u = 8; u < 15; u++)
        this.setFunctionModule(8, this.size - 15 + u, h(d, u));
      this.setFunctionModule(8, this.size - 8, !0);
    }
    // Draws two copies of the version bits (with its own error correction code),
    // based on this object's version field, iff 7 <= version <= 40.
    drawVersion() {
      if (this.version < 7)
        return;
      let n = this.version;
      for (let o = 0; o < 12; o++)
        n = n << 1 ^ (n >>> 11) * 7973;
      const s = this.version << 12 | n;
      g(s >>> 18 == 0);
      for (let o = 0; o < 18; o++) {
        const d = h(s, o), u = this.size - 11 + o % 3, x = Math.floor(o / 3);
        this.setFunctionModule(u, x, d), this.setFunctionModule(x, u, d);
      }
    }
    // Draws a 9*9 finder pattern including the border separator,
    // with the center module at (x, y). Modules can be out of bounds.
    drawFinderPattern(n, s) {
      for (let o = -4; o <= 4; o++)
        for (let d = -4; d <= 4; d++) {
          const u = Math.max(Math.abs(d), Math.abs(o)), x = n + d, y = s + o;
          0 <= x && x < this.size && 0 <= y && y < this.size && this.setFunctionModule(x, y, u != 2 && u != 4);
        }
    }
    // Draws a 5*5 alignment pattern, with the center module
    // at (x, y). All modules must be in bounds.
    drawAlignmentPattern(n, s) {
      for (let o = -2; o <= 2; o++)
        for (let d = -2; d <= 2; d++)
          this.setFunctionModule(n + d, s + o, Math.max(Math.abs(d), Math.abs(o)) != 1);
    }
    // Sets the color of a module and marks it as a function module.
    // Only used by the constructor. Coordinates must be in bounds.
    setFunctionModule(n, s, o) {
      this.modules[s][n] = o, this.isFunction[s][n] = !0;
    }
    /*-- Private helper methods for constructor: Codewords and masking --*/
    // Returns a new byte string representing the given data with the appropriate error correction
    // codewords appended to it, based on this object's version and error correction level.
    addEccAndInterleave(n) {
      const s = this.version, o = this.errorCorrectionLevel;
      if (n.length != R.getNumDataCodewords(s, o))
        throw new RangeError("Invalid argument");
      const d = R.NUM_ERROR_CORRECTION_BLOCKS[o.ordinal][s], u = R.ECC_CODEWORDS_PER_BLOCK[o.ordinal][s], x = Math.floor(R.getNumRawDataModules(s) / 8), y = d - x % d, b = Math.floor(x / d);
      let m = [];
      const E = R.reedSolomonComputeDivisor(u);
      for (let S = 0, I = 0; S < d; S++) {
        let P = n.slice(I, I + b - u + (S < y ? 0 : 1));
        I += P.length;
        const X = R.reedSolomonComputeRemainder(P, E);
        S < y && P.push(0), m.push(P.concat(X));
      }
      let v = [];
      for (let S = 0; S < m[0].length; S++)
        m.forEach((I, P) => {
          (S != b - u || P >= y) && v.push(I[S]);
        });
      return g(v.length == x), v;
    }
    // Draws the given sequence of 8-bit codewords (data and error correction) onto the entire
    // data area of this QR Code. Function modules need to be marked off before this is called.
    drawCodewords(n) {
      if (n.length != Math.floor(R.getNumRawDataModules(this.version) / 8))
        throw new RangeError("Invalid argument");
      let s = 0;
      for (let o = this.size - 1; o >= 1; o -= 2) {
        o == 6 && (o = 5);
        for (let d = 0; d < this.size; d++)
          for (let u = 0; u < 2; u++) {
            const x = o - u, b = (o + 1 & 2) == 0 ? this.size - 1 - d : d;
            !this.isFunction[b][x] && s < n.length * 8 && (this.modules[b][x] = h(n[s >>> 3], 7 - (s & 7)), s++);
          }
      }
      g(s == n.length * 8);
    }
    // XORs the codeword modules in this QR Code with the given mask pattern.
    // The function modules must be marked and the codeword bits must be drawn
    // before masking. Due to the arithmetic of XOR, calling applyMask() with
    // the same mask value a second time will undo the mask. A final well-formed
    // QR Code needs exactly one (not zero, two, etc.) mask applied.
    applyMask(n) {
      if (n < 0 || n > 7)
        throw new RangeError("Mask value out of range");
      for (let s = 0; s < this.size; s++)
        for (let o = 0; o < this.size; o++) {
          let d;
          switch (n) {
            case 0:
              d = (o + s) % 2 == 0;
              break;
            case 1:
              d = s % 2 == 0;
              break;
            case 2:
              d = o % 3 == 0;
              break;
            case 3:
              d = (o + s) % 3 == 0;
              break;
            case 4:
              d = (Math.floor(o / 3) + Math.floor(s / 2)) % 2 == 0;
              break;
            case 5:
              d = o * s % 2 + o * s % 3 == 0;
              break;
            case 6:
              d = (o * s % 2 + o * s % 3) % 2 == 0;
              break;
            case 7:
              d = ((o + s) % 2 + o * s % 3) % 2 == 0;
              break;
            default:
              throw new Error("Unreachable");
          }
          !this.isFunction[s][o] && d && (this.modules[s][o] = !this.modules[s][o]);
        }
    }
    // Calculates and returns the penalty score based on state of this QR Code's current modules.
    // This is used by the automatic mask choice algorithm to find the mask pattern that yields the lowest score.
    getPenaltyScore() {
      let n = 0;
      for (let u = 0; u < this.size; u++) {
        let x = !1, y = 0, b = [0, 0, 0, 0, 0, 0, 0];
        for (let m = 0; m < this.size; m++)
          this.modules[u][m] == x ? (y++, y == 5 ? n += R.PENALTY_N1 : y > 5 && n++) : (this.finderPenaltyAddHistory(y, b), x || (n += this.finderPenaltyCountPatterns(b) * R.PENALTY_N3), x = this.modules[u][m], y = 1);
        n += this.finderPenaltyTerminateAndCount(x, y, b) * R.PENALTY_N3;
      }
      for (let u = 0; u < this.size; u++) {
        let x = !1, y = 0, b = [0, 0, 0, 0, 0, 0, 0];
        for (let m = 0; m < this.size; m++)
          this.modules[m][u] == x ? (y++, y == 5 ? n += R.PENALTY_N1 : y > 5 && n++) : (this.finderPenaltyAddHistory(y, b), x || (n += this.finderPenaltyCountPatterns(b) * R.PENALTY_N3), x = this.modules[m][u], y = 1);
        n += this.finderPenaltyTerminateAndCount(x, y, b) * R.PENALTY_N3;
      }
      for (let u = 0; u < this.size - 1; u++)
        for (let x = 0; x < this.size - 1; x++) {
          const y = this.modules[u][x];
          y == this.modules[u][x + 1] && y == this.modules[u + 1][x] && y == this.modules[u + 1][x + 1] && (n += R.PENALTY_N2);
        }
      let s = 0;
      for (const u of this.modules)
        s = u.reduce((x, y) => x + (y ? 1 : 0), s);
      const o = this.size * this.size, d = Math.ceil(Math.abs(s * 20 - o * 10) / o) - 1;
      return g(0 <= d && d <= 9), n += d * R.PENALTY_N4, g(0 <= n && n <= 2568888), n;
    }
    /*-- Private helper functions --*/
    // Returns an ascending list of positions of alignment patterns for this version number.
    // Each position is in the range [0,177), and are used on both the x and y axes.
    // This could be implemented as lookup table of 40 variable-length lists of integers.
    getAlignmentPatternPositions() {
      if (this.version == 1)
        return [];
      {
        const n = Math.floor(this.version / 7) + 2, s = this.version == 32 ? 26 : Math.ceil((this.version * 4 + 4) / (n * 2 - 2)) * 2;
        let o = [6];
        for (let d = this.size - 7; o.length < n; d -= s)
          o.splice(1, 0, d);
        return o;
      }
    }
    // Returns the number of data bits that can be stored in a QR Code of the given version number, after
    // all function modules are excluded. This includes remainder bits, so it might not be a multiple of 8.
    // The result is in the range [208, 29648]. This could be implemented as a 40-entry lookup table.
    static getNumRawDataModules(n) {
      if (n < R.MIN_VERSION || n > R.MAX_VERSION)
        throw new RangeError("Version number out of range");
      let s = (16 * n + 128) * n + 64;
      if (n >= 2) {
        const o = Math.floor(n / 7) + 2;
        s -= (25 * o - 10) * o - 55, n >= 7 && (s -= 36);
      }
      return g(208 <= s && s <= 29648), s;
    }
    // Returns the number of 8-bit data (i.e. not error correction) codewords contained in any
    // QR Code of the given version number and error correction level, with remainder bits discarded.
    // This stateless pure function could be implemented as a (40*4)-cell lookup table.
    static getNumDataCodewords(n, s) {
      return Math.floor(R.getNumRawDataModules(n) / 8) - R.ECC_CODEWORDS_PER_BLOCK[s.ordinal][n] * R.NUM_ERROR_CORRECTION_BLOCKS[s.ordinal][n];
    }
    // Returns a Reed-Solomon ECC generator polynomial for the given degree. This could be
    // implemented as a lookup table over all possible parameter values, instead of as an algorithm.
    static reedSolomonComputeDivisor(n) {
      if (n < 1 || n > 255)
        throw new RangeError("Degree out of range");
      let s = [];
      for (let d = 0; d < n - 1; d++)
        s.push(0);
      s.push(1);
      let o = 1;
      for (let d = 0; d < n; d++) {
        for (let u = 0; u < s.length; u++)
          s[u] = R.reedSolomonMultiply(s[u], o), u + 1 < s.length && (s[u] ^= s[u + 1]);
        o = R.reedSolomonMultiply(o, 2);
      }
      return s;
    }
    // Returns the Reed-Solomon error correction codeword for the given data and divisor polynomials.
    static reedSolomonComputeRemainder(n, s) {
      let o = s.map((d) => 0);
      for (const d of n) {
        const u = d ^ o.shift();
        o.push(0), s.forEach((x, y) => o[y] ^= R.reedSolomonMultiply(x, u));
      }
      return o;
    }
    // Returns the product of the two given field elements modulo GF(2^8/0x11D). The arguments and result
    // are unsigned 8-bit integers. This could be implemented as a lookup table of 256*256 entries of uint8.
    static reedSolomonMultiply(n, s) {
      if (n >>> 8 || s >>> 8)
        throw new RangeError("Byte out of range");
      let o = 0;
      for (let d = 7; d >= 0; d--)
        o = o << 1 ^ (o >>> 7) * 285, o ^= (s >>> d & 1) * n;
      return g(o >>> 8 == 0), o;
    }
    // Can only be called immediately after a light run is added, and
    // returns either 0, 1, or 2. A helper function for getPenaltyScore().
    finderPenaltyCountPatterns(n) {
      const s = n[1];
      g(s <= this.size * 3);
      const o = s > 0 && n[2] == s && n[3] == s * 3 && n[4] == s && n[5] == s;
      return (o && n[0] >= s * 4 && n[6] >= s ? 1 : 0) + (o && n[6] >= s * 4 && n[0] >= s ? 1 : 0);
    }
    // Must be called at the end of a line (row or column) of modules. A helper function for getPenaltyScore().
    finderPenaltyTerminateAndCount(n, s, o) {
      return n && (this.finderPenaltyAddHistory(s, o), s = 0), s += this.size, this.finderPenaltyAddHistory(s, o), this.finderPenaltyCountPatterns(o);
    }
    // Pushes the given value to the front and drops the last value. A helper function for getPenaltyScore().
    finderPenaltyAddHistory(n, s) {
      s[0] == 0 && (n += this.size), s.pop(), s.unshift(n);
    }
  };
  i.MIN_VERSION = 1, i.MAX_VERSION = 40, i.PENALTY_N1 = 3, i.PENALTY_N2 = 3, i.PENALTY_N3 = 40, i.PENALTY_N4 = 10, i.ECC_CODEWORDS_PER_BLOCK = [
    // Version: (note that index 0 is for padding, and is set to an illegal value)
    //0,  1,  2,  3,  4,  5,  6,  7,  8,  9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40    Error correction level
    [-1, 7, 10, 15, 20, 26, 18, 20, 24, 30, 18, 20, 24, 26, 30, 22, 24, 28, 30, 28, 28, 28, 28, 30, 30, 26, 28, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30],
    // Low
    [-1, 10, 16, 26, 18, 24, 16, 18, 22, 22, 26, 30, 22, 22, 24, 24, 28, 28, 26, 26, 26, 26, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28],
    // Medium
    [-1, 13, 22, 18, 26, 18, 24, 18, 22, 20, 24, 28, 26, 24, 20, 30, 24, 28, 28, 26, 30, 28, 30, 30, 30, 30, 28, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30],
    // Quartile
    [-1, 17, 28, 22, 16, 22, 28, 26, 26, 24, 28, 24, 28, 22, 24, 24, 30, 28, 28, 26, 28, 30, 24, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30]
    // High
  ], i.NUM_ERROR_CORRECTION_BLOCKS = [
    // Version: (note that index 0 is for padding, and is set to an illegal value)
    //0, 1, 2, 3, 4, 5, 6, 7, 8, 9,10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40    Error correction level
    [-1, 1, 1, 1, 1, 1, 2, 2, 2, 2, 4, 4, 4, 4, 4, 6, 6, 6, 6, 7, 8, 8, 9, 9, 10, 12, 12, 12, 13, 14, 15, 16, 17, 18, 19, 19, 20, 21, 22, 24, 25],
    // Low
    [-1, 1, 1, 1, 2, 2, 4, 4, 4, 5, 5, 5, 8, 9, 9, 10, 10, 11, 13, 14, 16, 17, 17, 18, 20, 21, 23, 25, 26, 28, 29, 31, 33, 35, 37, 38, 40, 43, 45, 47, 49],
    // Medium
    [-1, 1, 1, 2, 2, 4, 4, 6, 6, 8, 8, 8, 10, 12, 16, 12, 17, 16, 18, 21, 20, 23, 23, 25, 27, 29, 34, 34, 35, 38, 40, 43, 45, 48, 51, 53, 56, 59, 62, 65, 68],
    // Quartile
    [-1, 1, 1, 2, 4, 4, 4, 5, 6, 8, 8, 11, 11, 16, 16, 18, 16, 19, 21, 25, 25, 25, 34, 30, 32, 35, 37, 40, 42, 45, 48, 51, 54, 57, 60, 63, 66, 70, 74, 77, 81]
    // High
  ], l.QrCode = i;
  function c(p, n, s) {
    if (n < 0 || n > 31 || p >>> n)
      throw new RangeError("Value out of range");
    for (let o = n - 1; o >= 0; o--)
      s.push(p >>> o & 1);
  }
  function h(p, n) {
    return (p >>> n & 1) != 0;
  }
  function g(p) {
    if (!p)
      throw new Error("Assertion error");
  }
  const a = class _ {
    /*-- Constructor (low level) and fields --*/
    // Creates a new QR Code segment with the given attributes and data.
    // The character count (numChars) must agree with the mode and the bit buffer length,
    // but the constraint isn't checked. The given bit buffer is cloned and stored.
    constructor(n, s, o) {
      if (this.mode = n, this.numChars = s, this.bitData = o, s < 0)
        throw new RangeError("Invalid argument");
      this.bitData = o.slice();
    }
    /*-- Static factory functions (mid level) --*/
    // Returns a segment representing the given binary data encoded in
    // byte mode. All input byte arrays are acceptable. Any text string
    // can be converted to UTF-8 bytes and encoded as a byte mode segment.
    static makeBytes(n) {
      let s = [];
      for (const o of n)
        c(o, 8, s);
      return new _(_.Mode.BYTE, n.length, s);
    }
    // Returns a segment representing the given string of decimal digits encoded in numeric mode.
    static makeNumeric(n) {
      if (!_.isNumeric(n))
        throw new RangeError("String contains non-numeric characters");
      let s = [];
      for (let o = 0; o < n.length; ) {
        const d = Math.min(n.length - o, 3);
        c(parseInt(n.substring(o, o + d), 10), d * 3 + 1, s), o += d;
      }
      return new _(_.Mode.NUMERIC, n.length, s);
    }
    // Returns a segment representing the given text string encoded in alphanumeric mode.
    // The characters allowed are: 0 to 9, A to Z (uppercase only), space,
    // dollar, percent, asterisk, plus, hyphen, period, slash, colon.
    static makeAlphanumeric(n) {
      if (!_.isAlphanumeric(n))
        throw new RangeError("String contains unencodable characters in alphanumeric mode");
      let s = [], o;
      for (o = 0; o + 2 <= n.length; o += 2) {
        let d = _.ALPHANUMERIC_CHARSET.indexOf(n.charAt(o)) * 45;
        d += _.ALPHANUMERIC_CHARSET.indexOf(n.charAt(o + 1)), c(d, 11, s);
      }
      return o < n.length && c(_.ALPHANUMERIC_CHARSET.indexOf(n.charAt(o)), 6, s), new _(_.Mode.ALPHANUMERIC, n.length, s);
    }
    // Returns a new mutable list of zero or more segments to represent the given Unicode text string.
    // The result may use various segment modes and switch modes to optimize the length of the bit stream.
    static makeSegments(n) {
      return n == "" ? [] : _.isNumeric(n) ? [_.makeNumeric(n)] : _.isAlphanumeric(n) ? [_.makeAlphanumeric(n)] : [_.makeBytes(_.toUtf8ByteArray(n))];
    }
    // Returns a segment representing an Extended Channel Interpretation
    // (ECI) designator with the given assignment value.
    static makeEci(n) {
      let s = [];
      if (n < 0)
        throw new RangeError("ECI assignment value out of range");
      if (n < 128)
        c(n, 8, s);
      else if (n < 16384)
        c(2, 2, s), c(n, 14, s);
      else if (n < 1e6)
        c(6, 3, s), c(n, 21, s);
      else
        throw new RangeError("ECI assignment value out of range");
      return new _(_.Mode.ECI, 0, s);
    }
    // Tests whether the given string can be encoded as a segment in numeric mode.
    // A string is encodable iff each character is in the range 0 to 9.
    static isNumeric(n) {
      return _.NUMERIC_REGEX.test(n);
    }
    // Tests whether the given string can be encoded as a segment in alphanumeric mode.
    // A string is encodable iff each character is in the following set: 0 to 9, A to Z
    // (uppercase only), space, dollar, percent, asterisk, plus, hyphen, period, slash, colon.
    static isAlphanumeric(n) {
      return _.ALPHANUMERIC_REGEX.test(n);
    }
    /*-- Methods --*/
    // Returns a new copy of the data bits of this segment.
    getData() {
      return this.bitData.slice();
    }
    // (Package-private) Calculates and returns the number of bits needed to encode the given segments at
    // the given version. The result is infinity if a segment has too many characters to fit its length field.
    static getTotalBits(n, s) {
      let o = 0;
      for (const d of n) {
        const u = d.mode.numCharCountBits(s);
        if (d.numChars >= 1 << u)
          return 1 / 0;
        o += 4 + u + d.bitData.length;
      }
      return o;
    }
    // Returns a new array of bytes representing the given string encoded in UTF-8.
    static toUtf8ByteArray(n) {
      n = encodeURI(n);
      let s = [];
      for (let o = 0; o < n.length; o++)
        n.charAt(o) != "%" ? s.push(n.charCodeAt(o)) : (s.push(parseInt(n.substring(o + 1, o + 3), 16)), o += 2);
      return s;
    }
  };
  a.NUMERIC_REGEX = /^[0-9]*$/, a.ALPHANUMERIC_REGEX = /^[A-Z0-9 $%*+.\/:-]*$/, a.ALPHANUMERIC_CHARSET = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ $%*+-./:";
  let k = a;
  l.QrSegment = a;
})(Fe || (Fe = {}));
((l) => {
  ((i) => {
    const c = class {
      // The QR Code can tolerate about 30% erroneous codewords
      /*-- Constructor and fields --*/
      constructor(g, a) {
        this.ordinal = g, this.formatBits = a;
      }
    };
    c.LOW = new c(0, 1), c.MEDIUM = new c(1, 0), c.QUARTILE = new c(2, 3), c.HIGH = new c(3, 2), i.Ecc = c;
  })(l.QrCode || (l.QrCode = {}));
})(Fe || (Fe = {}));
((l) => {
  ((i) => {
    const c = class {
      /*-- Constructor and fields --*/
      constructor(g, a) {
        this.modeBits = g, this.numBitsCharCount = a;
      }
      /*-- Method --*/
      // (Package-private) Returns the bit width of the character count field for a segment in
      // this mode in a QR Code at the given version number. The result is in the range [0, 16].
      numCharCountBits(g) {
        return this.numBitsCharCount[Math.floor((g + 7) / 17)];
      }
    };
    c.NUMERIC = new c(1, [10, 12, 14]), c.ALPHANUMERIC = new c(2, [9, 11, 13]), c.BYTE = new c(4, [8, 16, 16]), c.KANJI = new c(8, [8, 10, 12]), c.ECI = new c(7, [0, 0, 0]), i.Mode = c;
  })(l.QrSegment || (l.QrSegment = {}));
})(Fe || (Fe = {}));
var Ne = Fe;
/**
 * @license qrcode.react
 * Copyright (c) Paul O'Shannessy
 * SPDX-License-Identifier: ISC
 */
var mn = {
  L: Ne.QrCode.Ecc.LOW,
  M: Ne.QrCode.Ecc.MEDIUM,
  Q: Ne.QrCode.Ecc.QUARTILE,
  H: Ne.QrCode.Ecc.HIGH
}, Pt = 128, zt = "L", _t = "#FFFFFF", Wt = "#000000", Ut = !1, $t = 1, xn = 4, yn = 0, bn = 0.1;
function Ht(l, i = 0) {
  const c = [];
  return l.forEach(function(h, g) {
    let a = null;
    h.forEach(function(k, p) {
      if (!k && a !== null) {
        c.push(
          `M${a + i} ${g + i}h${p - a}v1H${a + i}z`
        ), a = null;
        return;
      }
      if (p === h.length - 1) {
        if (!k)
          return;
        a === null ? c.push(`M${p + i},${g + i} h1v1H${p + i}z`) : c.push(
          `M${a + i},${g + i} h${p + 1 - a}v1H${a + i}z`
        );
        return;
      }
      k && a === null && (a = p);
    });
  }), c.join("");
}
function Gt(l, i) {
  return l.slice().map((c, h) => h < i.y || h >= i.y + i.h ? c : c.map((g, a) => a < i.x || a >= i.x + i.w ? g : !1));
}
function wn(l, i, c, h) {
  if (h == null)
    return null;
  const g = l.length + c * 2, a = Math.floor(i * bn), k = g / i, p = (h.width || a) * k, n = (h.height || a) * k, s = h.x == null ? l.length / 2 - p / 2 : h.x * k, o = h.y == null ? l.length / 2 - n / 2 : h.y * k, d = h.opacity == null ? 1 : h.opacity;
  let u = null;
  if (h.excavate) {
    let y = Math.floor(s), b = Math.floor(o), m = Math.ceil(p + s - y), E = Math.ceil(n + o - b);
    u = { x: y, y: b, w: m, h: E };
  }
  const x = h.crossOrigin;
  return { x: s, y: o, h: n, w: p, excavation: u, opacity: d, crossOrigin: x };
}
function kn(l, i) {
  return i != null ? Math.max(Math.floor(i), 0) : l ? xn : yn;
}
function Yt({
  value: l,
  level: i,
  minVersion: c,
  includeMargin: h,
  marginSize: g,
  imageSettings: a,
  size: k,
  boostLevel: p
}) {
  let n = U.useMemo(() => {
    const y = (Array.isArray(l) ? l : [l]).reduce((b, m) => (b.push(...Ne.QrSegment.makeSegments(m)), b), []);
    return Ne.QrCode.encodeSegments(
      y,
      mn[i],
      c,
      void 0,
      void 0,
      p
    );
  }, [l, i, c, p]);
  const { cells: s, margin: o, numCells: d, calculatedImageSettings: u } = U.useMemo(() => {
    let x = n.getModules();
    const y = kn(h, g), b = x.length + y * 2, m = wn(
      x,
      k,
      y,
      a
    );
    return {
      cells: x,
      margin: y,
      numCells: b,
      calculatedImageSettings: m
    };
  }, [n, k, a, h, g]);
  return {
    qrcode: n,
    margin: o,
    cells: s,
    numCells: d,
    calculatedImageSettings: u
  };
}
var vn = function() {
  try {
    new Path2D().addPath(new Path2D());
  } catch {
    return !1;
  }
  return !0;
}(), Sn = U.forwardRef(
  function(i, c) {
    const h = i, {
      value: g,
      size: a = Pt,
      level: k = zt,
      bgColor: p = _t,
      fgColor: n = Wt,
      includeMargin: s = Ut,
      minVersion: o = $t,
      boostLevel: d,
      marginSize: u,
      imageSettings: x
    } = h, b = gt(h, [
      "value",
      "size",
      "level",
      "bgColor",
      "fgColor",
      "includeMargin",
      "minVersion",
      "boostLevel",
      "marginSize",
      "imageSettings"
    ]), { style: m } = b, E = gt(b, ["style"]), v = x == null ? void 0 : x.src, S = U.useRef(null), I = U.useRef(null), P = U.useCallback(
      (N) => {
        S.current = N, typeof c == "function" ? c(N) : c && (c.current = N);
      },
      [c]
    ), [X, de] = U.useState(!1), { margin: J, cells: re, numCells: ee, calculatedImageSettings: V } = Yt({
      value: g,
      level: k,
      minVersion: o,
      boostLevel: d,
      includeMargin: s,
      marginSize: u,
      imageSettings: x,
      size: a
    });
    U.useEffect(() => {
      if (S.current != null) {
        const N = S.current, H = N.getContext("2d");
        if (!H)
          return;
        let ge = re;
        const se = I.current, ue = V != null && se !== null && se.complete && se.naturalHeight !== 0 && se.naturalWidth !== 0;
        ue && V.excavation != null && (ge = Gt(
          re,
          V.excavation
        ));
        const oe = window.devicePixelRatio || 1;
        N.height = N.width = a * oe;
        const me = a / ee * oe;
        H.scale(me, me), H.fillStyle = p, H.fillRect(0, 0, ee, ee), H.fillStyle = n, vn ? H.fill(new Path2D(Ht(ge, J))) : re.forEach(function(ye, he) {
          ye.forEach(function(ve, C) {
            ve && H.fillRect(C + J, he + J, 1, 1);
          });
        }), V && (H.globalAlpha = V.opacity), ue && H.drawImage(
          se,
          V.x + J,
          V.y + J,
          V.w,
          V.h
        );
      }
    }), U.useEffect(() => {
      de(!1);
    }, [v]);
    const T = pt({ height: a, width: a }, m);
    let z = null;
    return v != null && (z = /* @__PURE__ */ U.createElement(
      "img",
      {
        src: v,
        key: v,
        style: { display: "none" },
        onLoad: () => {
          de(!0);
        },
        ref: I,
        crossOrigin: V == null ? void 0 : V.crossOrigin
      }
    )), /* @__PURE__ */ U.createElement(U.Fragment, null, /* @__PURE__ */ U.createElement(
      "canvas",
      pt({
        style: T,
        height: a,
        width: a,
        ref: P,
        role: "img"
      }, E)
    ), z);
  }
);
Sn.displayName = "QRCodeCanvas";
var Vt = U.forwardRef(
  function(i, c) {
    const h = i, {
      value: g,
      size: a = Pt,
      level: k = zt,
      bgColor: p = _t,
      fgColor: n = Wt,
      includeMargin: s = Ut,
      minVersion: o = $t,
      boostLevel: d,
      title: u,
      marginSize: x,
      imageSettings: y
    } = h, b = gt(h, [
      "value",
      "size",
      "level",
      "bgColor",
      "fgColor",
      "includeMargin",
      "minVersion",
      "boostLevel",
      "title",
      "marginSize",
      "imageSettings"
    ]), { margin: m, cells: E, numCells: v, calculatedImageSettings: S } = Yt({
      value: g,
      level: k,
      minVersion: o,
      boostLevel: d,
      includeMargin: s,
      marginSize: x,
      imageSettings: y,
      size: a
    });
    let I = E, P = null;
    y != null && S != null && (S.excavation != null && (I = Gt(
      E,
      S.excavation
    )), P = /* @__PURE__ */ U.createElement(
      "image",
      {
        href: y.src,
        height: S.h,
        width: S.w,
        x: S.x + m,
        y: S.y + m,
        preserveAspectRatio: "none",
        opacity: S.opacity,
        crossOrigin: S.crossOrigin
      }
    ));
    const X = Ht(I, m);
    return /* @__PURE__ */ U.createElement(
      "svg",
      pt({
        height: a,
        width: a,
        viewBox: `0 0 ${v} ${v}`,
        ref: c,
        role: "img"
      }, b),
      !!u && /* @__PURE__ */ U.createElement("title", null, u),
      /* @__PURE__ */ U.createElement(
        "path",
        {
          fill: p,
          d: `M0,0 h${v}v${v}H0z`,
          shapeRendering: "crispEdges"
        }
      ),
      /* @__PURE__ */ U.createElement("path", { fill: n, d: X, shapeRendering: "crispEdges" }),
      P
    );
  }
);
Vt.displayName = "QRCodeSVG";
const jn = typeof window < "u" && window.__WEAVE_API_BASE__ || "http://localhost:4000/api/v1";
async function mt(l, i, c) {
  const h = {
    "Content-Type": "application/json",
    "x-api-key": i,
    ...c == null ? void 0 : c.headers
  }, g = await fetch(`${jn}${l}`, { ...c, headers: h });
  if (g.status === 204) return null;
  const a = await g.json();
  if (!a.success) throw new Error(a.error ?? "API error");
  return a.data;
}
const Ye = (l) => `fiat:${l.toUpperCase()}`, at = (l, i) => `crypto:${l.toUpperCase()}:${i.toUpperCase()}`;
async function lt(l, i) {
  const c = new URLSearchParams({
    from: i.from,
    to: i.to,
    amount: String(i.amount),
    ...i.amountIn ? { amountIn: i.amountIn } : {}
  });
  return mt(`/quotes?${c}`, l);
}
async function ct(l, i) {
  return mt("/orders", l, {
    method: "POST",
    body: JSON.stringify(i)
  });
}
async function Ze(l, i) {
  return mt(`/orders/${i}`, l);
}
const En = Vt, qe = {
  forest: "#3D6B50",
  tan: "#B8935A",
  ink: "#1C1B17"
}, r = {
  ink: "var(--weave-ink, #0B0F0E)",
  ink2: "var(--weave-ink2, #3A4240)",
  mute: "var(--weave-mute, #6B7572)",
  hair: "var(--weave-hair, #E8EAE6)",
  surface: "var(--weave-surface, #FFFFFF)",
  panel: "var(--weave-panel, #FAFAF7)",
  accent: "var(--weave-accent, #0F5D4C)",
  accentSoft: "var(--weave-accent-soft, #E6F0EC)",
  good: "var(--weave-good, #1F7A4D)",
  goodSoft: "var(--weave-good-soft, #E6F3EC)",
  warn: "var(--weave-warn, #A46A00)",
  warnSoft: "var(--weave-warn-soft, #FBF0DC)",
  err: "var(--weave-err, #A8321E)"
}, ie = {
  NGN: { name: "Nigerian Naira", symbol: "₦", flag: "🇳🇬", rate: 1515, min: 5e3, country: "Nigeria", psp: "GTBank", bank: "GTBank ••7890", method: "Bank transfer" }
}, Ve = [
  {
    token: "ETH",
    chain: "Optimism",
    amount: 0.312,
    usd: 1024.4,
    icon: "Ξ",
    chainTint: "#ff3f57",
    logo: "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/info/logo.png"
  },
  {
    token: "USDC",
    chain: "Base",
    amount: 150,
    usd: 150,
    icon: "$",
    chainTint: "#1C4FE0",
    logo: "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48/logo.png"
  },
  {
    token: "STRK",
    chain: "Starknet",
    amount: 840,
    usd: 184.8,
    icon: "S",
    chainTint: "#EC796B",
    logo: "https://assets.coingecko.com/coins/images/35293/standard/starknet.png"
  },
  {
    token: "DAI",
    chain: "Ethereum",
    amount: 502,
    usd: 502,
    icon: "D",
    chainTint: "#F5AC37",
    logo: "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0x6B175474E89094C44Da98b954EedeAC495271d0F/logo.png"
  }
], pe = (l, i, c) => {
  const h = ie[i];
  if (!h) return `${l.toFixed(2)} ${i}`;
  const g = c ?? (Number.isInteger(l) ? 0 : 2), a = g === 2 ? Math.ceil(l * 100) / 100 : l, k = new Intl.NumberFormat("en-US", {
    minimumFractionDigits: g,
    maximumFractionDigits: g
  }).format(a);
  return `${h.symbol}${k}`;
}, $e = (l, i = 2) => {
  const c = Math.pow(10, i);
  return (Math.ceil(l * c) / c).toLocaleString("en-US", {
    minimumFractionDigits: i,
    maximumFractionDigits: i
  });
}, Cn = async (l, i, c, h) => {
  const g = document.createElement("canvas"), a = g.getContext("2d");
  if (!a) return;
  const k = qe[h] || h || "#0F5D4C", p = 800, n = 1100;
  g.width = p, g.height = n, a.fillStyle = "#FDFDFB", a.fillRect(0, 0, p, n), a.strokeStyle = "#E8EAE6", a.lineWidth = 2, a.strokeRect(40, 40, p - 80, n - 80), a.fillStyle = k, a.font = "700 32px Figtree, Inter, sans-serif", a.fillText("Weave", 80, 110), a.fillStyle = "#6B7572", a.font = "500 16px Inter, sans-serif", a.fillText("PAYMENT RECEIPT", p - 240, 105), a.fillStyle = "#E6F0EC";
  const s = 230, o = 36;
  a.beginPath(), a.roundRect(80, 160, s, o, 8), a.fill(), a.fillStyle = k, a.font = "700 12px Inter, sans-serif", a.textAlign = "center", a.fillText("✓ TRANSACTION SUCCESSFUL", 80 + s / 2, 182), a.textAlign = "left", a.fillStyle = "#0B0F0E", a.font = "700 72px Figtree, Inter, sans-serif";
  const d = pe(l.amount, l.currency);
  a.fillText(d, 80, 280), a.fillStyle = "#6B7572", a.font = "500 18px Inter, sans-serif", a.fillText("Total amount paid to " + l.name, 80, 315);
  const u = (m, E, v) => {
    a.fillStyle = "#6B7572", a.font = "500 15px Inter, sans-serif", a.fillText(m, 80, v), a.fillStyle = "#0B0F0E", a.font = "600 16px Inter, sans-serif", a.textAlign = "right", a.fillText(E, p - 80, v), a.textAlign = "left", a.strokeStyle = "#E8EAE6", a.lineWidth = 1, a.beginPath(), a.moveTo(80, v + 25), a.lineTo(p - 80, v + 25), a.stroke();
  }, x = new Date((i == null ? void 0 : i.createdAt) || Date.now()).toLocaleDateString("en-US", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
  u("Payment Date", x, 420), u("Transaction Ref", ((i == null ? void 0 : i.id) || "N/A").toUpperCase(), 490), u("Merchant", l.name, 560), u("Payout Destination", c, 630), u("Status", "Completed", 700), a.fillStyle = "#F5F4EF", a.fillRect(80, 800, p - 160, 120), a.fillStyle = "#0B0F0E", a.font = "600 16px Inter, sans-serif", a.fillText("Security Verification", 110, 845), a.fillStyle = "#6B7572", a.font = "400 14px Inter, sans-serif", a.fillText("This transaction was secured with 256-bit encryption by Paycrest.", 110, 875), a.fillText("You can verify this order directly on the Weave Dashboard.", 110, 895), a.textAlign = "center", a.fillStyle = "#0B0F0E", a.font = "700 24px Figtree, Inter, sans-serif", a.fillText("Thank you for using Weave.", p / 2, 1020), a.fillStyle = "#6B7572", a.font = "400 12px Inter, sans-serif", a.fillText("Support: help@weave.com", p / 2, 1050);
  const y = g.toDataURL("image/png"), b = document.createElement("a");
  b.download = `weave-receipt-${((i == null ? void 0 : i.id) || "txn").slice(0, 8)}.png`, b.href = y, b.click();
};
function j({ gap: l = 12, children: i, style: c }) {
  return /* @__PURE__ */ e.jsx("div", { style: { display: "flex", flexDirection: "column", gap: l, ...c }, children: i });
}
function Y({
  gap: l = 10,
  align: i = "center",
  justify: c = "flex-start",
  children: h,
  style: g
}) {
  return /* @__PURE__ */ e.jsx("div", { style: { display: "flex", alignItems: i, justifyContent: c, gap: l, ...g }, children: h });
}
function Oe() {
  return /* @__PURE__ */ e.jsx("div", { style: { height: 1, background: r.hair, width: "100%" } });
}
function xt({ children: l, tone: i = "neutral" }) {
  const c = {
    neutral: { bg: "#F1F0EB", fg: r.ink2 },
    good: { bg: r.goodSoft, fg: r.good },
    accent: { bg: r.accentSoft, fg: r.accent },
    warn: { bg: r.warnSoft, fg: r.warn }
  }[i];
  return /* @__PURE__ */ e.jsx("span", { style: {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    height: 22,
    padding: "0 9px",
    borderRadius: 999,
    background: c.bg,
    color: c.fg,
    fontSize: 11.5,
    fontWeight: 500,
    letterSpacing: 0.1
  }, children: l });
}
function Ae({ bg: l, children: i, size: c = 32 }) {
  return /* @__PURE__ */ e.jsx("div", { style: {
    width: c,
    height: c,
    borderRadius: c / 2,
    background: l,
    color: "#fff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 700,
    fontSize: c * 0.42,
    flexShrink: 0,
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace"
  }, children: i });
}
function yt({ size: l = 22 }) {
  return /* @__PURE__ */ e.jsxs("svg", { width: l, height: l, viewBox: "0 0 24 24", fill: "none", "aria-hidden": !0, children: [
    /* @__PURE__ */ e.jsx("path", { d: "M3 5 L8 19 L12 9 L16 19 L21 5", stroke: r.accent, strokeWidth: "2.2", strokeLinecap: "round", strokeLinejoin: "round" }),
    /* @__PURE__ */ e.jsx("path", { d: "M5 9 L12 19 L19 9", stroke: r.ink, strokeWidth: "1.2", strokeLinecap: "round", strokeLinejoin: "round", opacity: "0.3" })
  ] });
}
const Qt = {
  width: 28,
  height: 28,
  borderRadius: 14,
  border: "none",
  cursor: "pointer",
  background: "transparent",
  color: r.mute,
  display: "flex",
  alignItems: "center",
  justifyContent: "center"
}, An = { ...Qt, color: r.ink };
function Rn({
  merchantName: l,
  onClose: i,
  showBack: c,
  onBack: h
}) {
  return /* @__PURE__ */ e.jsxs("div", { style: {
    padding: "16px 20px 14px",
    display: "flex",
    alignItems: "center",
    gap: 10,
    borderBottom: `1px solid ${r.hair}`
  }, children: [
    c ? /* @__PURE__ */ e.jsx("button", { onClick: h, style: An, children: /* @__PURE__ */ e.jsx("svg", { width: "14", height: "14", viewBox: "0 0 24 24", fill: "none", children: /* @__PURE__ */ e.jsx("path", { d: "M15 18L9 12L15 6", stroke: "currentColor", strokeWidth: "2.2", strokeLinecap: "round", strokeLinejoin: "round" }) }) }) : /* @__PURE__ */ e.jsxs("div", { style: { display: "flex", alignItems: "center", gap: 8 }, children: [
      /* @__PURE__ */ e.jsx(yt, { size: 22 }),
      /* @__PURE__ */ e.jsx("span", { style: { fontWeight: 600, fontSize: 15, letterSpacing: -0.2 }, children: "Weave" })
    ] }),
    /* @__PURE__ */ e.jsxs("div", { style: { flex: 1, textAlign: "center", fontSize: 12.5, color: r.mute }, children: [
      "Paying ",
      /* @__PURE__ */ e.jsx("span", { style: { color: r.ink, fontWeight: 500 }, children: l })
    ] }),
    /* @__PURE__ */ e.jsx("button", { onClick: i, style: Qt, children: /* @__PURE__ */ e.jsx("svg", { width: "14", height: "14", viewBox: "0 0 24 24", fill: "none", children: /* @__PURE__ */ e.jsx("path", { d: "M6 6L18 18M6 18L18 6", stroke: "currentColor", strokeWidth: "2.2", strokeLinecap: "round" }) }) })
  ] });
}
function Tn() {
  return /* @__PURE__ */ e.jsxs("div", { style: {
    padding: "12px 20px 14px",
    borderTop: `1px solid ${r.hair}`,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    fontSize: 11,
    color: r.mute,
    background: r.panel,
    borderRadius: "0 0 16px 16px"
  }, children: [
    /* @__PURE__ */ e.jsxs("div", { style: { display: "flex", alignItems: "center", gap: 6 }, children: [
      /* @__PURE__ */ e.jsx("svg", { width: "11", height: "11", viewBox: "0 0 24 24", fill: "none", children: /* @__PURE__ */ e.jsx("path", { d: "M12 2L3 6V12C3 17 6.5 21 12 22C17.5 21 21 17 21 12V6L12 2Z", stroke: "currentColor", strokeWidth: "1.8" }) }),
      "Secured by Weave by Dewdrop Labs"
    ] }),
    /* @__PURE__ */ e.jsx("div", { style: { display: "flex", alignItems: "center", gap: 10 }, children: /* @__PURE__ */ e.jsx("span", { children: "v1.0.0" }) })
  ] });
}
const Bt = {
  width: "100%",
  padding: "12px 14px",
  borderRadius: 12,
  border: `1px solid ${r.hair}`,
  background: "#fff",
  cursor: "pointer",
  fontFamily: "inherit",
  display: "flex",
  alignItems: "center",
  gap: 12,
  transition: "border-color 0.15s, background 0.15s, transform 0.1s"
}, dt = {
  padding: "10px 12px",
  borderRadius: 10,
  border: `1px solid ${r.hair}`,
  background: "#fff",
  cursor: "pointer",
  fontFamily: "inherit",
  display: "flex",
  alignItems: "center",
  gap: 8,
  transition: "border-color 0.15s, background 0.15s"
}, Pe = {
  width: "100%",
  height: 46,
  borderRadius: 10,
  border: "none",
  background: r.ink,
  color: "#fff",
  fontSize: 14.5,
  fontWeight: 500,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
  cursor: "pointer",
  fontFamily: "inherit",
  letterSpacing: -0.1,
  transition: "transform 0.08s, background 0.2s"
}, Kt = {
  width: "100%",
  height: 46,
  borderRadius: 10,
  border: `1px solid ${r.hair}`,
  background: "#fff",
  color: r.ink,
  fontSize: 14,
  fontWeight: 500,
  display: "flex",
  alignItems: "center",
  gap: 10,
  paddingLeft: 14,
  paddingRight: 14,
  cursor: "pointer",
  fontFamily: "inherit"
};
function Fn({ onPick: l, merchant: i }) {
  const c = ie[i.currency], [h, g] = L(!1);
  return /* @__PURE__ */ e.jsxs(j, { gap: 16, style: { padding: "22px 20px 6px" }, children: [
    /* @__PURE__ */ e.jsxs(j, { gap: 10, style: { alignItems: "center", padding: "4px 0 6px" }, children: [
      /* @__PURE__ */ e.jsx("div", { style: {
        width: 44,
        height: 44,
        borderRadius: 10,
        background: qe[i.currency === "USDC" ? "ink" : "forest"] || "#2B1810",
        color: "#FFFFFF",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontWeight: 700,
        fontSize: 18,
        fontFamily: "var(--weave-font-display, Georgia, serif)",
        boxShadow: "0 2px 8px rgba(0,0,0,0.12)"
      }, children: (() => {
        var k;
        const a = i.name.trim().split(/\s+/).filter(Boolean);
        return a.length >= 2 ? (a[0][0] + a[1][0]).toUpperCase() : ((k = a[0]) == null ? void 0 : k.slice(0, 2).toUpperCase()) ?? "?";
      })() }),
      /* @__PURE__ */ e.jsxs(j, { gap: 3, style: { alignItems: "center" }, children: [
        /* @__PURE__ */ e.jsxs("div", { style: { fontSize: 12.5, color: r.mute }, children: [
          "Pay ",
          i.name
        ] }),
        /* @__PURE__ */ e.jsx("div", { style: { fontSize: 30, fontWeight: 600, letterSpacing: -0.6, color: r.ink }, children: pe(i.amount, i.currency) }),
        /* @__PURE__ */ e.jsx("div", { style: { fontSize: 11.5, color: r.mute }, children: i.description || "Secure checkout" })
      ] })
    ] }),
    /* @__PURE__ */ e.jsxs(j, { gap: 8, children: [
      /* @__PURE__ */ e.jsx("div", { style: { fontSize: 11, color: r.mute, textTransform: "uppercase", letterSpacing: 0.6 }, children: "How would you like to pay?" }),
      /* @__PURE__ */ e.jsxs("button", { onClick: () => l("fiat"), style: Bt, children: [
        /* @__PURE__ */ e.jsx("div", { style: { width: 40, height: 40, borderRadius: 10, background: "#fff", border: `1px solid ${r.hair}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }, children: /* @__PURE__ */ e.jsx("svg", { width: "20", height: "20", viewBox: "0 0 24 24", fill: "none", children: /* @__PURE__ */ e.jsx("path", { d: "M3 21H21M5 21V10M9 21V10M15 21V10M19 21V10M2 10L12 3L22 10H2Z", stroke: r.ink, strokeWidth: "1.7", strokeLinecap: "round", strokeLinejoin: "round" }) }) }),
        /* @__PURE__ */ e.jsxs(j, { gap: 2, style: { flex: 1, textAlign: "left", minWidth: 0 }, children: [
          /* @__PURE__ */ e.jsx("div", { style: { fontSize: 14, fontWeight: 500, color: r.ink }, children: "Bank transfer" }),
          /* @__PURE__ */ e.jsxs("div", { style: { fontSize: 11.5, color: r.mute }, children: [
            "Pay in ",
            c.name,
            " · Instant · No fees"
          ] })
        ] }),
        /* @__PURE__ */ e.jsx("svg", { width: "14", height: "14", viewBox: "0 0 24 24", fill: "none", style: { marginLeft: 4, flexShrink: 0 }, children: /* @__PURE__ */ e.jsx("path", { d: "M9 6L15 12L9 18", stroke: r.mute, strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round" }) })
      ] }),
      /* @__PURE__ */ e.jsxs("button", { onClick: () => l("deposit"), style: Bt, children: [
        /* @__PURE__ */ e.jsx("div", { style: { width: 40, height: 40, borderRadius: 10, background: "#fff", border: `1px solid ${r.hair}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }, children: /* @__PURE__ */ e.jsx(Ae, { bg: "#F6851B", size: 24, children: "🦊" }) }),
        /* @__PURE__ */ e.jsxs(j, { gap: 2, style: { flex: 1, textAlign: "left", minWidth: 0 }, children: [
          /* @__PURE__ */ e.jsx("div", { style: { fontSize: 14, fontWeight: 500 }, children: "Pay with crypto wallet" }),
          /* @__PURE__ */ e.jsx("div", { style: { fontSize: 11.5, color: r.mute }, children: "MetaMask detected · Any chain, any token" })
        ] }),
        /* @__PURE__ */ e.jsx("svg", { width: "14", height: "14", viewBox: "0 0 24 24", fill: "none", style: { marginLeft: 4, flexShrink: 0 }, children: /* @__PURE__ */ e.jsx("path", { d: "M9 6L15 12L9 18", stroke: r.mute, strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round" }) })
      ] }),
      h ? /* @__PURE__ */ e.jsxs(j, { gap: 6, style: { padding: "2px 0" }, children: [
        /* @__PURE__ */ e.jsxs(Y, { gap: 6, children: [
          /* @__PURE__ */ e.jsxs("button", { onClick: () => l("deposit"), style: { ...dt, flex: 1 }, children: [
            /* @__PURE__ */ e.jsx(Ae, { bg: "#3B99FC", size: 20, children: "W" }),
            /* @__PURE__ */ e.jsx("span", { style: { fontSize: 12.5, fontWeight: 500 }, children: "WalletConnect" })
          ] }),
          /* @__PURE__ */ e.jsxs("button", { onClick: () => l("deposit"), style: { ...dt, flex: 1 }, children: [
            /* @__PURE__ */ e.jsx(Ae, { bg: "#0052FF", size: 20, children: "B" }),
            /* @__PURE__ */ e.jsx("span", { style: { fontSize: 12.5, fontWeight: 500 }, children: "Coinbase" })
          ] })
        ] }),
        /* @__PURE__ */ e.jsxs("button", { onClick: () => l("deposit"), style: dt, children: [
          /* @__PURE__ */ e.jsx("div", { style: { width: 20, height: 20, borderRadius: 5, background: r.panel, border: `1px solid ${r.hair}`, display: "flex", alignItems: "center", justifyContent: "center" }, children: /* @__PURE__ */ e.jsxs("svg", { width: "10", height: "10", viewBox: "0 0 24 24", fill: "none", children: [
            /* @__PURE__ */ e.jsx("rect", { x: "3", y: "3", width: "7", height: "7", stroke: r.ink, strokeWidth: "2" }),
            /* @__PURE__ */ e.jsx("rect", { x: "14", y: "3", width: "7", height: "7", stroke: r.ink, strokeWidth: "2" }),
            /* @__PURE__ */ e.jsx("rect", { x: "3", y: "14", width: "7", height: "7", stroke: r.ink, strokeWidth: "2" })
          ] }) }),
          /* @__PURE__ */ e.jsx("span", { style: { fontSize: 12.5, fontWeight: 500 }, children: "Pay from mobile / hardware / exchange" }),
          /* @__PURE__ */ e.jsx("svg", { width: "12", height: "12", viewBox: "0 0 24 24", fill: "none", style: { marginLeft: "auto" }, children: /* @__PURE__ */ e.jsx("path", { d: "M9 6L15 12L9 18", stroke: r.mute, strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round" }) })
        ] })
      ] }) : /* @__PURE__ */ e.jsx("button", { onClick: () => g(!0), style: {
        background: "transparent",
        border: "none",
        cursor: "pointer",
        fontFamily: "inherit",
        fontSize: 12,
        color: r.mute,
        padding: "4px 0",
        textAlign: "center"
      }, children: "Use a different wallet ↓" })
    ] })
  ] });
}
function Bn({
  onNext: l,
  merchant: i,
  balances: c,
  selected: h,
  setSelected: g
}) {
  return /* @__PURE__ */ e.jsxs(j, { gap: 14, style: { padding: "18px 20px 6px" }, children: [
    /* @__PURE__ */ e.jsxs(j, { gap: 4, children: [
      /* @__PURE__ */ e.jsx("div", { style: { fontSize: 18, fontWeight: 600, letterSpacing: -0.3 }, children: "Choose what you'd like to pay with" }),
      /* @__PURE__ */ e.jsxs("div", { style: { fontSize: 12.5, color: r.mute }, children: [
        "We found these balances in your wallet. Pick any — we'll convert to ",
        ie[i.currency].name,
        " for ",
        i.name,
        "."
      ] })
    ] }),
    /* @__PURE__ */ e.jsx(j, { gap: 6, children: c.map((a, k) => {
      const p = a.usd >= i.amount / ie[i.currency].rate, n = h === k;
      return /* @__PURE__ */ e.jsxs(
        "button",
        {
          onClick: () => p && g(k),
          disabled: !p,
          style: {
            width: "100%",
            padding: "12px 14px",
            background: n ? r.accentSoft : "#fff",
            border: `1.5px solid ${n ? r.accent : r.hair}`,
            borderRadius: 12,
            cursor: p ? "pointer" : "not-allowed",
            opacity: p ? 1 : 0.48,
            display: "flex",
            alignItems: "center",
            gap: 12,
            textAlign: "left",
            fontFamily: "inherit",
            transition: "all 0.15s"
          },
          children: [
            /* @__PURE__ */ e.jsx(Ae, { bg: a.chainTint, size: 36, children: a.logo ? /* @__PURE__ */ e.jsx("img", { src: a.logo, style: { width: "100%", height: "100%", borderRadius: "inherit", objectFit: "cover" } }) : a.icon }),
            /* @__PURE__ */ e.jsxs(j, { gap: 2, style: { flex: 1 }, children: [
              /* @__PURE__ */ e.jsxs("div", { style: { fontSize: 14, fontWeight: 500, color: r.ink }, children: [
                $e(a.amount),
                " ",
                a.token
              ] }),
              /* @__PURE__ */ e.jsxs("div", { style: { fontSize: 12, color: r.mute }, children: [
                "on ",
                a.chain,
                " · ≈ $",
                a.usd.toFixed(2)
              ] })
            ] }),
            !p && /* @__PURE__ */ e.jsx(xt, { tone: "warn", children: "Too low" }),
            p && n && /* @__PURE__ */ e.jsx("div", { style: { width: 20, height: 20, borderRadius: 10, background: r.accent, display: "flex", alignItems: "center", justifyContent: "center" }, children: /* @__PURE__ */ e.jsx("svg", { width: "12", height: "12", viewBox: "0 0 24 24", fill: "none", children: /* @__PURE__ */ e.jsx("path", { d: "M5 12L10 17L19 7", stroke: "white", strokeWidth: "3", strokeLinecap: "round", strokeLinejoin: "round" }) }) })
          ]
        },
        k
      );
    }) }),
    /* @__PURE__ */ e.jsx("button", { onClick: () => l("quote"), style: { ...Pe, opacity: h === null ? 0.5 : 1 }, disabled: h === null, children: "Continue" })
  ] });
}
function Ln({
  merchant: l,
  balance: i,
  onConfirm: c,
  submitting: h,
  error: g,
  quote: a,
  quoteLoading: k
}) {
  const p = l.amount / ie[l.currency].rate, n = a ? a.breakdown.inputAmount : p, s = n / (i.usd / i.amount), o = a ? a.breakdown.bridgeFeeUsd : i.chain === "Base" && i.token === "USDC" ? 0 : 1.8, d = a ? a.breakdown.senderFeeUsd + a.breakdown.appFeeUsd : n * 75e-4, u = o + d, x = a ? a.breakdown.sellRate : ie[l.currency].rate, y = a ? a.estimatedFiat : l.amount;
  return /* @__PURE__ */ e.jsxs(j, { gap: 14, style: { padding: "16px 20px 6px" }, children: [
    /* @__PURE__ */ e.jsxs(j, { gap: 6, children: [
      /* @__PURE__ */ e.jsx("div", { style: { fontSize: 11, color: r.mute, textTransform: "uppercase", letterSpacing: 0.6 }, children: "You pay" }),
      /* @__PURE__ */ e.jsxs(Y, { align: "baseline", gap: 8, children: [
        /* @__PURE__ */ e.jsx("div", { style: { fontSize: 30, fontWeight: 600, letterSpacing: -0.6 }, children: $e(s, 4) }),
        /* @__PURE__ */ e.jsx("div", { style: { fontSize: 16, color: r.ink2, fontWeight: 500 }, children: i.token })
      ] }),
      /* @__PURE__ */ e.jsxs(Y, { gap: 6, style: { fontSize: 12, color: r.mute }, children: [
        /* @__PURE__ */ e.jsx(Ae, { bg: i.chainTint, size: 14, children: i.icon }),
        "on ",
        i.chain
      ] })
    ] }),
    /* @__PURE__ */ e.jsxs("div", { style: { padding: "2px 0", position: "relative" }, children: [
      /* @__PURE__ */ e.jsx(Oe, {}),
      /* @__PURE__ */ e.jsxs("div", { style: {
        position: "absolute",
        left: "50%",
        top: "50%",
        transform: "translate(-50%, -50%)",
        background: "#fff",
        padding: "0 10px",
        fontSize: 11,
        color: r.mute,
        letterSpacing: 0.4,
        display: "flex",
        alignItems: "center",
        gap: 6
      }, children: [
        /* @__PURE__ */ e.jsx("svg", { width: "11", height: "11", viewBox: "0 0 24 24", fill: "none", children: /* @__PURE__ */ e.jsx("path", { d: "M12 5V19M5 12L12 19L19 12", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round" }) }),
        "converts to"
      ] })
    ] }),
    /* @__PURE__ */ e.jsxs(j, { gap: 6, children: [
      /* @__PURE__ */ e.jsxs("div", { style: { fontSize: 11, color: r.mute, textTransform: "uppercase", letterSpacing: 0.6 }, children: [
        l.name,
        " receives"
      ] }),
      /* @__PURE__ */ e.jsx(Y, { align: "baseline", gap: 8, children: /* @__PURE__ */ e.jsx("div", { style: { fontSize: 30, fontWeight: 600, letterSpacing: -0.6, color: r.accent }, children: pe(y, l.currency) }) }),
      /* @__PURE__ */ e.jsxs(Y, { gap: 6, style: { fontSize: 12, color: r.mute }, children: [
        "via ",
        ie[l.currency].method,
        " · ",
        ie[l.currency].psp
      ] })
    ] }),
    /* @__PURE__ */ e.jsxs(j, { gap: 7, style: { fontSize: 12.5 }, children: [
      /* @__PURE__ */ e.jsxs(Y, { justify: "space-between", children: [
        /* @__PURE__ */ e.jsx("span", { style: { color: r.mute }, children: "Rate" }),
        /* @__PURE__ */ e.jsxs("span", { children: [
          "1 USDC = ",
          pe(x, l.currency)
        ] })
      ] }),
      o > 0 && /* @__PURE__ */ e.jsxs(Y, { justify: "space-between", children: [
        /* @__PURE__ */ e.jsx("span", { style: { color: r.mute }, children: "Network & bridge" }),
        /* @__PURE__ */ e.jsxs("span", { children: [
          "$",
          o.toFixed(2)
        ] })
      ] }),
      /* @__PURE__ */ e.jsxs(Y, { justify: "space-between", children: [
        /* @__PURE__ */ e.jsx("span", { style: { color: r.mute }, children: "Weave fee" }),
        /* @__PURE__ */ e.jsxs("span", { children: [
          "$",
          d.toFixed(2)
        ] })
      ] }),
      /* @__PURE__ */ e.jsx(Oe, {}),
      /* @__PURE__ */ e.jsxs(Y, { justify: "space-between", style: { fontWeight: 500, color: r.ink }, children: [
        /* @__PURE__ */ e.jsx("span", { children: "Total fees" }),
        /* @__PURE__ */ e.jsxs("span", { children: [
          "$",
          u.toFixed(2)
        ] })
      ] }),
      k && /* @__PURE__ */ e.jsx("div", { style: { fontSize: 11, color: r.mute, textAlign: "center" }, children: "Fetching live rate…" })
    ] }),
    /* @__PURE__ */ e.jsxs(j, { gap: 8, children: [
      g && /* @__PURE__ */ e.jsx("div", { style: {
        background: "#FBEEE9",
        border: `1px solid ${r.err}33`,
        borderRadius: 10,
        padding: "10px 12px",
        fontSize: 12,
        color: r.err,
        lineHeight: 1.5
      }, children: g }),
      /* @__PURE__ */ e.jsxs("button", { onClick: c, disabled: h, style: { ...Pe, opacity: h ? 0.6 : 1, cursor: h ? "not-allowed" : "pointer" }, children: [
        h ? "Creating order…" : "Confirm in wallet",
        !h && /* @__PURE__ */ e.jsx("svg", { width: "14", height: "14", viewBox: "0 0 24 24", fill: "none", children: /* @__PURE__ */ e.jsx("path", { d: "M5 12H19M13 6L19 12L13 18", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round" }) })
      ] }),
      /* @__PURE__ */ e.jsx("div", { style: { fontSize: 11, color: r.mute, textAlign: "center" }, children: "Rate locked for 30s · You'll sign one transaction in your wallet" })
    ] })
  ] });
}
function In() {
  return /* @__PURE__ */ e.jsxs("div", { style: { position: "relative", width: 56, height: 56 }, children: [
    /* @__PURE__ */ e.jsxs("svg", { width: "56", height: "56", viewBox: "0 0 56 56", style: { position: "absolute", inset: 0 }, children: [
      /* @__PURE__ */ e.jsx("circle", { cx: "28", cy: "28", r: "24", stroke: r.hair, strokeWidth: "2.5", fill: "none" }),
      /* @__PURE__ */ e.jsx(
        "circle",
        {
          cx: "28",
          cy: "28",
          r: "24",
          stroke: r.accent,
          strokeWidth: "2.5",
          fill: "none",
          strokeDasharray: "40 150",
          strokeLinecap: "round",
          style: { transformOrigin: "center", animation: "wspin 1.2s linear infinite" }
        }
      )
    ] }),
    /* @__PURE__ */ e.jsx("div", { style: { position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }, children: /* @__PURE__ */ e.jsx(yt, { size: 22 }) })
  ] });
}
const Mn = /* @__PURE__ */ new Set(["completed"]), Dn = /* @__PURE__ */ new Set(["failed", "expired", "refunded"]);
function Lt({
  onNext: l,
  merchant: i,
  mode: c,
  apiKey: h,
  orderId: g,
  bankDetails: a
}) {
  const [k, p] = L(0), [n, s] = L(0), o = Ke(!1), d = ie[i.currency];
  Ce(() => {
    const b = setInterval(() => s((m) => m + 1), 1e3);
    return () => clearInterval(b);
  }, []);
  const u = a != null && a.amountToTransfer ? (() => {
    const b = a.amountToTransfer, m = b.includes(".") ? b.split(".")[1].length : 0;
    return pe(Number(b), i.currency, m);
  })() : pe(i.amount, i.currency), x = c === "fiat" ? [
    { label: "Confirming your transfer", sub: `Matching the ${u} from your bank`, dur: 1600 },
    { label: "Completing payment", sub: `Sending to ${i.name}`, dur: 2400 }
  ] : [
    { label: "Waiting for deposit", sub: "Detecting your transaction on-chain", dur: 1400 },
    { label: "Confirming your payment", sub: `Settling ${d.name} to ${i.name}`, dur: 2600 }
  ];
  Ce(() => {
    if (g) return;
    if (k >= x.length) {
      l("success");
      return;
    }
    const b = setTimeout(() => p((m) => m + 1), x[k].dur);
    return () => clearTimeout(b);
  }, [k, g]), Ce(() => {
    if (!g) return;
    o.current = !1;
    let b;
    const m = async () => {
      if (!o.current) {
        try {
          const E = await Ze(h, g), v = String(E.status ?? "").toLowerCase(), S = String(E.paycrestStatus ?? "").toLowerCase();
          if (Mn.has(v)) {
            o.current = !0, l("success");
            return;
          }
          if (Dn.has(v)) {
            o.current = !0, l("error");
            return;
          }
          S === "fulfilled" && p(1);
        } catch {
        }
        b = setTimeout(m, 5e3);
      }
    };
    return m(), () => {
      o.current = !0, clearTimeout(b);
    };
  }, [g, h]);
  const y = x[Math.min(k, x.length - 1)];
  return /* @__PURE__ */ e.jsxs(j, { gap: 20, style: { padding: "28px 20px 12px", minHeight: 360 }, children: [
    /* @__PURE__ */ e.jsxs(j, { gap: 12, style: { alignItems: "center", paddingTop: 12 }, children: [
      /* @__PURE__ */ e.jsx(In, {}),
      /* @__PURE__ */ e.jsxs(j, { gap: 4, style: { alignItems: "center" }, children: [
        /* @__PURE__ */ e.jsx("div", { style: { fontSize: 17, fontWeight: 600, letterSpacing: -0.3 }, children: y.label }),
        /* @__PURE__ */ e.jsx("div", { style: { fontSize: 12.5, color: r.mute, textAlign: "center" }, children: y.sub })
      ] })
    ] }),
    /* @__PURE__ */ e.jsx(j, { gap: 0, style: { padding: "4px 8px" }, children: x.map((b, m) => /* @__PURE__ */ e.jsxs(Y, { gap: 12, style: { padding: "10px 0" }, children: [
      /* @__PURE__ */ e.jsxs("div", { style: {
        width: 22,
        height: 22,
        borderRadius: 11,
        flexShrink: 0,
        background: m < k ? r.accent : "#fff",
        border: m < k ? "none" : `1.5px solid ${m === k ? r.accent : r.hair}`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        position: "relative"
      }, children: [
        m < k && /* @__PURE__ */ e.jsx("svg", { width: "12", height: "12", viewBox: "0 0 24 24", fill: "none", children: /* @__PURE__ */ e.jsx("path", { d: "M5 12L10 17L19 7", stroke: "white", strokeWidth: "3", strokeLinecap: "round", strokeLinejoin: "round" }) }),
        m === k && /* @__PURE__ */ e.jsx("div", { style: { width: 8, height: 8, borderRadius: 4, background: r.accent, animation: "wpulse 1.1s ease-in-out infinite" } })
      ] }),
      /* @__PURE__ */ e.jsxs(j, { gap: 1, children: [
        /* @__PURE__ */ e.jsx("div", { style: { fontSize: 13, fontWeight: 500, color: m <= k ? r.ink : r.mute }, children: b.label }),
        /* @__PURE__ */ e.jsx("div", { style: { fontSize: 11.5, color: r.mute }, children: m < k ? "Completed" : m === k ? b.sub : "Pending" })
      ] })
    ] }, m)) }),
    /* @__PURE__ */ e.jsx("div", { style: { fontSize: 11, color: r.mute, textAlign: "center" }, children: "You can safely close this window. We'll email a receipt." })
  ] });
}
function It({
  onNext: l,
  merchant: i,
  balance: c,
  direction: h,
  apiKey: g,
  orderId: a,
  accentColor: k
}) {
  var b;
  const [p, n] = L(null);
  Ce(() => {
    if (!a) return;
    let m = !1;
    return Ze(g, a).then((E) => {
      m || n(E);
    }).catch(() => {
    }), () => {
      m = !0;
    };
  }, [g, a]);
  const s = typeof (p == null ? void 0 : p.sourceAssetKey) == "string" ? p.sourceAssetKey.split(":").pop() : void 0, o = h === "offramp" && p ? `${$e(Number(p.sourceAmount), 4)} ${s ?? c.token}` : `${$e(c.amount * 0.3, 4)} ${c.token}`, d = (b = p == null ? void 0 : p.destInstrument) == null ? void 0 : b.bankInstitution, u = h === "offramp" ? d ? qt(i.currency, d) : ie[i.currency].bank : i.name, x = p != null && p.createdAt && (p != null && p.updatedAt) ? Math.max(1, Math.round((new Date(p.updatedAt).getTime() - new Date(p.createdAt).getTime()) / 1e3)) : null, y = x == null ? "—" : x < 60 ? `${x}s` : `${Math.round(x / 60)}m`;
  return /* @__PURE__ */ e.jsxs(j, { gap: 18, style: { padding: "28px 20px 12px", minHeight: 360 }, children: [
    /* @__PURE__ */ e.jsxs(j, { gap: 14, style: { alignItems: "center", paddingTop: 8 }, children: [
      /* @__PURE__ */ e.jsx("div", { style: {
        width: 64,
        height: 64,
        borderRadius: 32,
        background: r.accent,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        animation: "wpop 0.5s cubic-bezier(0.2, 1.2, 0.4, 1)"
      }, children: /* @__PURE__ */ e.jsx("svg", { width: "32", height: "32", viewBox: "0 0 24 24", fill: "none", children: /* @__PURE__ */ e.jsx("path", { d: "M5 12L10 17L19 7", stroke: "white", strokeWidth: "3.2", strokeLinecap: "round", strokeLinejoin: "round" }) }) }),
      /* @__PURE__ */ e.jsxs(j, { gap: 4, style: { alignItems: "center" }, children: [
        /* @__PURE__ */ e.jsx("div", { style: { fontSize: 20, fontWeight: 600, letterSpacing: -0.3 }, children: "Payment complete" }),
        /* @__PURE__ */ e.jsx("div", { style: { fontSize: 13, color: r.mute, textAlign: "center", lineHeight: 1.5, maxWidth: 280 }, children: h === "offramp" ? /* @__PURE__ */ e.jsxs(e.Fragment, { children: [
          pe(i.amount, i.currency),
          " is on its way to ",
          /* @__PURE__ */ e.jsx("span", { style: { color: r.ink }, children: i.name }),
          "."
        ] }) : /* @__PURE__ */ e.jsxs(e.Fragment, { children: [
          "Your payment of ",
          pe(i.amount, i.currency),
          " has been sent to ",
          /* @__PURE__ */ e.jsx("span", { style: { color: r.ink }, children: i.name }),
          "."
        ] }) })
      ] })
    ] }),
    /* @__PURE__ */ e.jsxs(j, { gap: 0, style: { background: r.panel, border: `1px solid ${r.hair}`, borderRadius: 12, overflow: "hidden" }, children: [
      /* @__PURE__ */ e.jsxs(Y, { justify: "space-between", style: { padding: "12px 14px", fontSize: 12.5 }, children: [
        /* @__PURE__ */ e.jsx("span", { style: { color: r.mute }, children: "Paid with" }),
        h === "offramp" ? /* @__PURE__ */ e.jsxs(Y, { gap: 6, children: [
          /* @__PURE__ */ e.jsx(Ae, { bg: c.chainTint, size: 16, children: c.icon }),
          /* @__PURE__ */ e.jsx("span", { style: { fontWeight: 500 }, children: o })
        ] }) : /* @__PURE__ */ e.jsxs(Y, { gap: 6, children: [
          /* @__PURE__ */ e.jsx("div", { style: { width: 16, height: 16, borderRadius: 8, background: "#fff", border: `1px solid ${r.hair}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10 }, children: ie[i.currency].flag }),
          /* @__PURE__ */ e.jsx("span", { style: { fontWeight: 500 }, children: pe(i.amount, i.currency) })
        ] })
      ] }),
      /* @__PURE__ */ e.jsx(Oe, {}),
      /* @__PURE__ */ e.jsxs(Y, { justify: "space-between", style: { padding: "12px 14px", fontSize: 12.5 }, children: [
        /* @__PURE__ */ e.jsx("span", { style: { color: r.mute }, children: h === "offramp" ? "Settled to" : "Paid to" }),
        /* @__PURE__ */ e.jsx("span", { style: { fontWeight: 500 }, children: u })
      ] }),
      /* @__PURE__ */ e.jsx(Oe, {}),
      /* @__PURE__ */ e.jsxs(Y, { justify: "space-between", style: { padding: "12px 14px", fontSize: 12.5 }, children: [
        /* @__PURE__ */ e.jsx("span", { style: { color: r.mute }, children: "Completed in" }),
        /* @__PURE__ */ e.jsx(Y, { gap: 6, children: /* @__PURE__ */ e.jsx(xt, { tone: "good", children: y }) })
      ] })
    ] }),
    /* @__PURE__ */ e.jsxs(j, { gap: 8, children: [
      /* @__PURE__ */ e.jsx("button", { onClick: () => l("connect"), style: Pe, children: "Done" }),
      /* @__PURE__ */ e.jsxs(
        "button",
        {
          onClick: () => Cn(i, p, u, k),
          style: { ...Kt, justifyContent: "center", paddingLeft: 0 },
          children: [
            /* @__PURE__ */ e.jsx("svg", { width: "14", height: "14", viewBox: "0 0 24 24", fill: "none", children: /* @__PURE__ */ e.jsx("path", { d: "M12 3V15M12 15L7 10M12 15L17 10M3 19H21", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round" }) }),
            "Download receipt"
          ]
        }
      )
    ] })
  ] });
}
function Mt({ onNext: l, onBack: i }) {
  return /* @__PURE__ */ e.jsxs(j, { gap: 16, style: { padding: "28px 20px 12px", minHeight: 360 }, children: [
    /* @__PURE__ */ e.jsxs(j, { gap: 14, style: { alignItems: "center", paddingTop: 8 }, children: [
      /* @__PURE__ */ e.jsx("div", { style: { width: 64, height: 64, borderRadius: 32, background: "#FBEEE9", display: "flex", alignItems: "center", justifyContent: "center" }, children: /* @__PURE__ */ e.jsxs("svg", { width: "32", height: "32", viewBox: "0 0 24 24", fill: "none", children: [
        /* @__PURE__ */ e.jsx("path", { d: "M12 8V13M12 17V17.01", stroke: r.err, strokeWidth: "2.4", strokeLinecap: "round" }),
        /* @__PURE__ */ e.jsx("circle", { cx: "12", cy: "12", r: "10", stroke: r.err, strokeWidth: "2" })
      ] }) }),
      /* @__PURE__ */ e.jsxs(j, { gap: 4, style: { alignItems: "center" }, children: [
        /* @__PURE__ */ e.jsx("div", { style: { fontSize: 18, fontWeight: 600 }, children: "Transaction didn't go through" }),
        /* @__PURE__ */ e.jsx("div", { style: { fontSize: 13, color: r.mute, textAlign: "center", maxWidth: 280 }, children: "Your wallet rejected the signature or the rate expired. No funds were moved." })
      ] })
    ] }),
    /* @__PURE__ */ e.jsxs(j, { gap: 8, children: [
      /* @__PURE__ */ e.jsx("button", { onClick: () => i("quote"), style: Pe, children: "Try again" }),
      /* @__PURE__ */ e.jsx("button", { onClick: () => l("connect"), style: Kt, children: "Use a different payment method" })
    ] })
  ] });
}
const ut = [
  // Base (our primary rail — USDC first)
  { id: "BASE", name: "Base", token: "USDC", tint: "#1C4FE0", icon: "$", network: "Base", logo: "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48/logo.png" },
  { id: "BASE", name: "Base", token: "ETH", tint: "#1C4FE0", icon: "Ξ", network: "Base", logo: "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/info/logo.png" },
  { id: "BASE", name: "Base", token: "cbBTC", tint: "#1C4FE0", icon: "₿", network: "Base", logo: "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/base/assets/0xcbB7C0000aB88B473b1f5aFd9ef808440eed33Bf/logo.png" },
  // Ethereum
  { id: "ETHEREUM", name: "Ethereum", token: "ETH", tint: "#627EEA", icon: "Ξ", network: "Ethereum", logo: "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/info/logo.png" },
  { id: "ETHEREUM", name: "Ethereum", token: "USDC", tint: "#627EEA", icon: "$", network: "Ethereum", logo: "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48/logo.png" },
  { id: "ETHEREUM", name: "Ethereum", token: "cbBTC", tint: "#627EEA", icon: "₿", network: "Ethereum", logo: "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xcbB7C0000aB88B473b1f5aFd9ef808440eed33Bf/logo.png" },
  { id: "ETHEREUM", name: "Ethereum", token: "USDT", tint: "#627EEA", icon: "T", network: "Ethereum", logo: "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xdAC17F958D2ee523a2206206994597C13D831ec7/logo.png" },
  { id: "ETHEREUM", name: "Ethereum", token: "PEPE", tint: "#627EEA", icon: "P", network: "Ethereum", logo: "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0x6982508145454Ce325dDbE47A25d4ec3d2311933/logo.png" },
  // Arbitrum / Optimism
  { id: "ARBITRUM", name: "Arbitrum", token: "ETH", tint: "#28A0F0", icon: "Ξ", network: "Arbitrum One", logo: "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/arbitrum/info/logo.png" },
  { id: "ARBITRUM", name: "Arbitrum", token: "USDC", tint: "#28A0F0", icon: "$", network: "Arbitrum One", logo: "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48/logo.png" },
  { id: "ARBITRUM", name: "Arbitrum", token: "USDT", tint: "#28A0F0", icon: "T", network: "Arbitrum One", logo: "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xdAC17F958D2ee523a2206206994597C13D831ec7/logo.png" },
  { id: "ARBITRUM", name: "Arbitrum", token: "cbBTC", tint: "#28A0F0", icon: "₿", network: "Arbitrum One", logo: "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/base/assets/0xcbB7C0000aB88B473b1f5aFd9ef808440eed33Bf/logo.png" },
  { id: "OPTIMISM", name: "Optimism", token: "ETH", tint: "#FF0420", icon: "Ξ", network: "Optimism", logo: "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/optimism/info/logo.png" },
  { id: "OPTIMISM", name: "Optimism", token: "USDC", tint: "#FF0420", icon: "$", network: "Optimism", logo: "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48/logo.png" },
  { id: "OPTIMISM", name: "Optimism", token: "USDT", tint: "#FF0420", icon: "T", network: "Optimism", logo: "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xdAC17F958D2ee523a2206206994597C13D831ec7/logo.png" },
  // Polygon / BSC / Avalanche
  { id: "POLYGON", name: "Polygon", token: "POL", tint: "#7B3FE4", icon: "P", network: "Polygon", logo: "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/polygon/info/logo.png" },
  { id: "POLYGON", name: "Polygon", token: "USDC", tint: "#7B3FE4", icon: "$", network: "Polygon", logo: "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48/logo.png" },
  { id: "POLYGON", name: "Polygon", token: "USDT", tint: "#7B3FE4", icon: "T", network: "Polygon", logo: "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xdAC17F958D2ee523a2206206994597C13D831ec7/logo.png" },
  { id: "BSC", name: "BNB Chain", token: "BNB", tint: "#F0B90B", icon: "B", network: "BNB Smart Chain", logo: "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/binance/info/logo.png" },
  { id: "BSC", name: "BNB Chain", token: "USDT", tint: "#F0B90B", icon: "T", network: "BNB Smart Chain", logo: "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xdAC17F958D2ee523a2206206994597C13D831ec7/logo.png" },
  { id: "BSC", name: "BNB Chain", token: "USDC", tint: "#F0B90B", icon: "$", network: "BNB Smart Chain", logo: "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48/logo.png" },
  { id: "AVALANCHE", name: "Avalanche", token: "AVAX", tint: "#E84142", icon: "A", network: "Avalanche C-Chain", logo: "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/avalanchex/info/logo.png" },
  { id: "AVALANCHE", name: "Avalanche", token: "USDC", tint: "#E84142", icon: "$", network: "Avalanche C-Chain", logo: "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48/logo.png" },
  { id: "AVALANCHE", name: "Avalanche", token: "USDT", tint: "#E84142", icon: "T", network: "Avalanche C-Chain", logo: "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xdAC17F958D2ee523a2206206994597C13D831ec7/logo.png" },
  // Other EVM L2s
  { id: "GNOSIS", name: "Gnosis", token: "USDC", tint: "#04795B", icon: "$", network: "Gnosis Chain", logo: "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48/logo.png" },
  { id: "GNOSIS", name: "Gnosis", token: "EURe", tint: "#04795B", icon: "€", network: "Gnosis Chain", logo: "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/xdai/info/logo.png" },
  { id: "SCROLL", name: "Scroll", token: "USDC", tint: "#D9A26C", icon: "$", network: "Scroll", logo: "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48/logo.png" },
  { id: "SCROLL", name: "Scroll", token: "USDT", tint: "#D9A26C", icon: "T", network: "Scroll", logo: "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xdAC17F958D2ee523a2206206994597C13D831ec7/logo.png" },
  { id: "ALEO", name: "Aleo", token: "ALEO", tint: "#111111", icon: "A", network: "Aleo", logo: "https://monad.xyz/favicon.ico" },
  { id: "XLAYER", name: "X Layer", token: "USDT", tint: "#1E1E1E", icon: "T", network: "X Layer", logo: "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xdAC17F958D2ee523a2206206994597C13D831ec7/logo.png" },
  { id: "BERA", name: "Berachain", token: "BERA", tint: "#814625", icon: "B", network: "Berachain", logo: "https://assets.coingecko.com/coins/images/31034/standard/bera.png" },
  // Non-EVM
  { id: "SOLANA", name: "Solana", token: "SOL", tint: "#14F195", icon: "S", network: "Solana", logo: "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/solana/info/logo.png" },
  { id: "SOLANA", name: "Solana", token: "USDC", tint: "#14F195", icon: "$", network: "Solana", logo: "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48/logo.png" },
  { id: "SOLANA", name: "Solana", token: "WIF", tint: "#14F195", icon: "W", network: "Solana", logo: "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/solana/assets/EKpQGSJtjMFqKZ9KQanAtY7YXDeJs2H3ob77S2SpxmX/logo.png" },
  { id: "TRON", name: "Tron", token: "TRX", tint: "#EF0027", icon: "T", network: "Tron", logo: "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/tron/info/logo.png" },
  { id: "TRON", name: "Tron", token: "USDT", tint: "#EF0027", icon: "T", network: "Tron", logo: "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xdAC17F958D2ee523a2206206994597C13D831ec7/logo.png" },
  { id: "NEAR", name: "NEAR", token: "NEAR", tint: "#111111", icon: "N", network: "NEAR", logo: "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/near/info/logo.png" },
  { id: "NEAR", name: "NEAR", token: "USDC", tint: "#111111", icon: "$", network: "NEAR", logo: "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48/logo.png" },
  { id: "TON", name: "TON", token: "TON", tint: "#0098EA", icon: "T", network: "TON", logo: "https://assets.coingecko.com/coins/images/17980/standard/ton_symbol.png" },
  { id: "TON", name: "TON", token: "USDT", tint: "#0098EA", icon: "T", network: "TON", logo: "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xdAC17F958D2ee523a2206206994597C13D831ec7/logo.png" },
  { id: "SUI", name: "Sui", token: "SUI", tint: "#4DA2FF", icon: "S", network: "Sui", logo: "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/sui/info/logo.png" },
  { id: "SUI", name: "Sui", token: "USDC", tint: "#4DA2FF", icon: "$", network: "Sui", logo: "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48/logo.png" },
  { id: "APTOS", name: "Aptos", token: "APT", tint: "#111111", icon: "A", network: "Aptos", logo: "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/aptos/info/logo.png" },
  { id: "APTOS", name: "Aptos", token: "USDC", tint: "#111111", icon: "$", network: "Aptos", logo: "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48/logo.png" },
  { id: "APTOS", name: "Aptos", token: "USDT", tint: "#111111", icon: "T", network: "Aptos", logo: "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xdAC17F958D2ee523a2206206994597C13D831ec7/logo.png" },
  { id: "STARKNET", name: "Starknet", token: "STRK", tint: "#EC796B", icon: "S", network: "Starknet", logo: "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/starknet/info/logo.png" },
  // Native-coin L1s
  { id: "BITCOIN", name: "Bitcoin", token: "BTC", tint: "#F7931A", icon: "₿", network: "Bitcoin", logo: "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/bitcoin/info/logo.png" },
  { id: "XRP", name: "XRP Ledger", token: "XRP", tint: "#23292F", icon: "X", network: "XRP Ledger", logo: "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ripple/info/logo.png" },
  { id: "STELLAR", name: "Stellar", token: "XLM", tint: "#111111", icon: "★", network: "Stellar", logo: "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/stellar/info/logo.png" },
  { id: "STELLAR", name: "Stellar", token: "USDC", tint: "#111111", icon: "$", network: "Stellar", logo: "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48/logo.png" },
  { id: "CARDANO", name: "Cardano", token: "ADA", tint: "#0033AD", icon: "₳", network: "Cardano", logo: "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/cardano/info/logo.png" },
  { id: "DOGE", name: "Dogecoin", token: "DOGE", tint: "#C2A633", icon: "D", network: "Dogecoin", logo: "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/doge/info/logo.png" },
  { id: "LITECOIN", name: "Litecoin", token: "LTC", tint: "#345D9D", icon: "L", network: "Litecoin", logo: "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/litecoin/info/logo.png" },
  { id: "BCH", name: "Bitcoin Cash", token: "BCH", tint: "#8DC351", icon: "B", network: "Bitcoin Cash", logo: "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/bitcoincash/info/logo.png" },
  { id: "ZEC", name: "Zcash", token: "ZEC", tint: "#F4B728", icon: "Z", network: "Zcash", logo: "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/zcash/info/logo.png" },
  { id: "DASH", name: "Dash", token: "DASH", tint: "#008CE7", icon: "D", network: "Dash", logo: "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/dash/info/logo.png" }
], Nn = /* @__PURE__ */ new Set(["XRP", "TON", "STELLAR", "NEAR"]), On = {
  BASE: "0x…",
  ETHEREUM: "0x…",
  ARBITRUM: "0x…",
  OPTIMISM: "0x…",
  POLYGON: "0x…",
  BSC: "0x…",
  AVALANCHE: "0x…",
  GNOSIS: "0x…",
  SCROLL: "0x…",
  XLAYER: "0x…",
  MONAD: "0x…",
  BERA: "0x…",
  SOLANA: "e.g. 5Gh8…base58",
  TRON: "T…",
  NEAR: "alice.near or 64-hex",
  TON: "UQ… / EQ…",
  SUI: "0x… (64 chars)",
  APTOS: "0x… (64 chars)",
  STARKNET: "0x…",
  BITCOIN: "bc1… or 1…",
  XRP: "r…",
  STELLAR: "G…",
  CARDANO: "addr1…",
  DOGE: "D…",
  LITECOIN: "ltc1… or L…",
  BCH: "bitcoincash:q… or q…",
  ZEC: "t1… or zs1…",
  DASH: "X…"
}, Pn = {
  "BASE:USDC": { chainId: 8453, contract: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", decimals: 6 },
  "OPTIMISM:USDC": { chainId: 10, contract: "0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85", decimals: 6 },
  "ARBITRUM:USDC": { chainId: 42161, contract: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831", decimals: 6 },
  "POLYGON:USDC": { chainId: 137, contract: "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359", decimals: 6 }
}, zn = (l, i, c, h) => {
  if (!l) return "";
  if (!i || !c || !h) return l;
  const g = Pn[`${c.toUpperCase()}:${h.toUpperCase()}`];
  if (!g) return l;
  const a = Math.ceil(i * 100) / 100, k = BigInt(Math.round(a * 10 ** g.decimals));
  return `ethereum:${g.contract}@${g.chainId}/transfer?address=${l}&uint256=${k.toString()}`;
};
function _n({
  onNext: l,
  merchant: i,
  depositAddress: c,
  depositMemo: h,
  amountToSend: g,
  sourceToken: a,
  sourceChain: k,
  loading: p,
  error: n,
  onChainChange: s,
  ready: o,
  apiKey: d,
  orderId: u
}) {
  const [x, y] = L(null), [b, m] = L(!1), [E, v] = L(""), [S, I] = L(""), [P, X] = L(!1), [de, J] = L(!1), [re, ee] = L(!1), V = E.trim() ? ut.map((C, G) => ({ c: C, i: G })).filter(({ c: C }) => {
    const G = E.trim().toLowerCase();
    return C.name.toLowerCase().includes(G) || C.token.toLowerCase().includes(G) || C.network.toLowerCase().includes(G) || C.id.toLowerCase().includes(G);
  }) : ut.map((C, G) => ({ c: C, i: G })), T = x != null ? ut[x] : null, z = c ?? "", N = h ?? "", H = a ?? (T == null ? void 0 : T.token) ?? "", ge = i.amount / ie[i.currency].rate, se = g ?? ge, ue = zn(z, g, k, a), oe = Ke(null), me = T ? Nn.has(T.id) : !1, ye = () => {
    if (!T || !S.trim()) return;
    const C = `${T.id}:${T.token}:${S.trim()}`;
    oe.current !== C && (oe.current = C, X(!0), s(T.id, T.token, S.trim()));
  };
  Ce(() => {
    X(!1), I(""), oe.current = null;
  }, [x]), Ce(() => {
    if (!u) return;
    let C = !1, G;
    const be = async () => {
      if (!C) {
        try {
          const fe = await Ze(d, u), te = String(fe.status ?? "").toLowerCase(), Se = String(fe.nearStatus ?? "").toLowerCase(), je = Array.isArray(fe.steps) && fe.steps.some((xe) => (xe == null ? void 0 : xe.provider) === "nearintents") && Se === "processing";
          if (te && te !== "awaiting_deposit" || je) {
            C = !0, te === "completed" ? l("success") : ["failed", "refunded"].includes(te) ? l("error") : l("processing");
            return;
          }
        } catch {
        }
        G = setTimeout(be, 5e3);
      }
    };
    return be(), () => {
      C = !0, clearTimeout(G);
    };
  }, [d, u, l]);
  const he = () => {
    var C;
    z && ((C = navigator.clipboard) == null || C.writeText(z), J(!0), setTimeout(() => J(!1), 1500));
  }, ve = () => {
    var C;
    N && ((C = navigator.clipboard) == null || C.writeText(N), ee(!0), setTimeout(() => ee(!1), 1500));
  };
  return b ? /* @__PURE__ */ e.jsxs(j, { gap: 12, style: { padding: "16px 20px 6px" }, children: [
    /* @__PURE__ */ e.jsxs(j, { gap: 8, children: [
      /* @__PURE__ */ e.jsxs(
        "button",
        {
          onClick: () => {
            m(!1), v("");
          },
          style: {
            alignSelf: "flex-start",
            padding: "4px 0",
            background: "transparent",
            border: "none",
            cursor: "pointer",
            fontSize: 12,
            color: r.mute,
            fontFamily: "inherit",
            display: "flex",
            alignItems: "center",
            gap: 6
          },
          children: [
            /* @__PURE__ */ e.jsx("svg", { width: "12", height: "12", viewBox: "0 0 24 24", fill: "none", children: /* @__PURE__ */ e.jsx("path", { d: "M15 18L9 12L15 6", stroke: "currentColor", strokeWidth: "2.2", strokeLinecap: "round", strokeLinejoin: "round" }) }),
            "Back"
          ]
        }
      ),
      /* @__PURE__ */ e.jsx("div", { style: { fontSize: 18, fontWeight: 600, letterSpacing: -0.3 }, children: "Select a network" }),
      /* @__PURE__ */ e.jsx("div", { style: { fontSize: 12.5, color: r.mute, lineHeight: 1.5 }, children: "We'll generate a deposit address for the network you choose." })
    ] }),
    /* @__PURE__ */ e.jsxs("div", { style: { position: "relative" }, children: [
      /* @__PURE__ */ e.jsxs("svg", { width: "14", height: "14", viewBox: "0 0 24 24", fill: "none", style: {
        position: "absolute",
        left: 12,
        top: "50%",
        transform: "translateY(-50%)",
        pointerEvents: "none"
      }, children: [
        /* @__PURE__ */ e.jsx("circle", { cx: "11", cy: "11", r: "7", stroke: r.mute, strokeWidth: "2" }),
        /* @__PURE__ */ e.jsx("path", { d: "M20 20L16 16", stroke: r.mute, strokeWidth: "2", strokeLinecap: "round" })
      ] }),
      /* @__PURE__ */ e.jsx(
        "input",
        {
          autoFocus: !0,
          placeholder: "Search networks or tokens…",
          value: E,
          onChange: (C) => v(C.target.value),
          style: {
            width: "100%",
            boxSizing: "border-box",
            padding: "10px 12px 10px 34px",
            borderRadius: 10,
            border: `1px solid ${r.hair}`,
            background: "#fff",
            fontSize: 13,
            fontFamily: "inherit",
            color: r.ink,
            outline: "none"
          }
        }
      )
    ] }),
    /* @__PURE__ */ e.jsx("div", { style: {
      maxHeight: 360,
      overflowY: "auto",
      border: `1px solid ${r.hair}`,
      borderRadius: 10,
      background: "#fff",
      padding: 4,
      display: "flex",
      flexDirection: "column",
      gap: 1
    }, children: V.length === 0 ? /* @__PURE__ */ e.jsxs("div", { style: { padding: "24px 10px", fontSize: 12, color: r.mute, textAlign: "center" }, children: [
      'No matches for "',
      E.trim(),
      '"'
    ] }) : V.map(({ c: C, i: G }) => /* @__PURE__ */ e.jsxs("button", { onClick: () => {
      y(G), m(!1), v("");
    }, style: {
      width: "100%",
      padding: "10px 10px",
      borderRadius: 7,
      background: G === x ? r.accentSoft : "transparent",
      border: "none",
      cursor: "pointer",
      fontFamily: "inherit",
      display: "flex",
      alignItems: "center",
      gap: 10,
      textAlign: "left"
    }, children: [
      /* @__PURE__ */ e.jsx(Ae, { bg: C.tint, size: 24, children: C.logo ? /* @__PURE__ */ e.jsx("img", { src: C.logo, style: { width: "100%", height: "100%", borderRadius: "inherit", objectFit: "cover" } }) : C.icon }),
      /* @__PURE__ */ e.jsxs("div", { style: { flex: 1 }, children: [
        /* @__PURE__ */ e.jsxs("div", { style: { fontSize: 13, fontWeight: 500 }, children: [
          C.token,
          " on ",
          C.name
        ] }),
        /* @__PURE__ */ e.jsx("div", { style: { fontSize: 10.5, color: r.mute }, children: C.network })
      ] }),
      G === x && /* @__PURE__ */ e.jsx("svg", { width: "14", height: "14", viewBox: "0 0 24 24", fill: "none", children: /* @__PURE__ */ e.jsx("path", { d: "M5 12L10 17L19 7", stroke: r.accent, strokeWidth: "2.8", strokeLinecap: "round", strokeLinejoin: "round" }) })
    ] }, `${C.id}:${C.token}`)) })
  ] }) : /* @__PURE__ */ e.jsxs(j, { gap: 14, style: { padding: "16px 20px 6px" }, children: [
    /* @__PURE__ */ e.jsxs(j, { gap: 4, children: [
      /* @__PURE__ */ e.jsx("div", { style: { fontSize: 18, fontWeight: 600, letterSpacing: -0.3 }, children: "Send from any wallet" }),
      /* @__PURE__ */ e.jsx("div", { style: { fontSize: 12.5, color: r.mute, lineHeight: 1.5 }, children: "Scan the QR or copy the address. Send from a mobile wallet, exchange, or hardware device — we'll detect the deposit automatically." })
    ] }),
    /* @__PURE__ */ e.jsxs(j, { gap: 6, children: [
      /* @__PURE__ */ e.jsx("div", { style: { fontSize: 11, color: r.mute, textTransform: "uppercase", letterSpacing: 0.6 }, children: "Network" }),
      /* @__PURE__ */ e.jsx("button", { onClick: () => m(!0), style: {
        padding: "10px 12px",
        borderRadius: 10,
        border: `1px solid ${r.hair}`,
        background: "#fff",
        cursor: "pointer",
        fontFamily: "inherit",
        display: "flex",
        alignItems: "center",
        gap: 10,
        textAlign: "left"
      }, children: T ? /* @__PURE__ */ e.jsxs(e.Fragment, { children: [
        /* @__PURE__ */ e.jsx(Ae, { bg: T.tint, size: 26, children: T.icon }),
        /* @__PURE__ */ e.jsxs(j, { gap: 1, style: { flex: 1 }, children: [
          /* @__PURE__ */ e.jsxs("div", { style: { fontSize: 13.5, fontWeight: 500 }, children: [
            T.token,
            " on ",
            T.name
          ] }),
          /* @__PURE__ */ e.jsx("div", { style: { fontSize: 11, color: r.mute }, children: T.network })
        ] }),
        /* @__PURE__ */ e.jsx("div", { style: { fontSize: 11, color: r.mute }, children: "Change" })
      ] }) : /* @__PURE__ */ e.jsxs(e.Fragment, { children: [
        /* @__PURE__ */ e.jsx("div", { style: {
          width: 26,
          height: 26,
          borderRadius: 13,
          border: `1px dashed ${r.hair}`,
          background: r.panel,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: r.mute,
          fontSize: 13
        }, children: "?" }),
        /* @__PURE__ */ e.jsxs(j, { gap: 1, style: { flex: 1 }, children: [
          /* @__PURE__ */ e.jsx("div", { style: { fontSize: 13.5, fontWeight: 500, color: r.ink }, children: "Choose a network" }),
          /* @__PURE__ */ e.jsx("div", { style: { fontSize: 11, color: r.mute }, children: "30+ chains supported · powered by NEAR Intents" })
        ] }),
        /* @__PURE__ */ e.jsx("svg", { width: "14", height: "14", viewBox: "0 0 24 24", fill: "none", children: /* @__PURE__ */ e.jsx("path", { d: "M6 9L12 15L18 9", stroke: r.mute, strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round" }) })
      ] }) })
    ] }),
    T ? P ? /* @__PURE__ */ e.jsxs(e.Fragment, { children: [
      /* @__PURE__ */ e.jsxs("div", { style: {
        background: r.panel,
        border: `1px solid ${r.hair}`,
        borderRadius: 12,
        padding: "16px",
        display: "flex",
        gap: 14,
        alignItems: "center"
      }, children: [
        /* @__PURE__ */ e.jsx("div", { style: { padding: 8, background: "#fff", borderRadius: 10, border: `1px solid ${r.hair}`, flexShrink: 0 }, children: ue ? /* @__PURE__ */ e.jsx(En, { value: ue, size: 120, level: "M", includeMargin: !1 }) : /* @__PURE__ */ e.jsxs("div", { style: {
          width: 120,
          height: 120,
          borderRadius: 6,
          background: r.panel,
          border: `1px dashed ${r.hair}`,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 8
        }, children: [
          /* @__PURE__ */ e.jsxs("svg", { width: "22", height: "22", viewBox: "0 0 24 24", style: { animation: "wspin 1s linear infinite" }, children: [
            /* @__PURE__ */ e.jsx("circle", { cx: "12", cy: "12", r: "9", stroke: r.hair, strokeWidth: "2.5", fill: "none" }),
            /* @__PURE__ */ e.jsx(
              "circle",
              {
                cx: "12",
                cy: "12",
                r: "9",
                stroke: r.accent,
                strokeWidth: "2.5",
                fill: "none",
                strokeDasharray: "18 60",
                strokeLinecap: "round"
              }
            )
          ] }),
          /* @__PURE__ */ e.jsx("div", { style: { fontSize: 10.5, color: r.mute, letterSpacing: 0.3 }, children: "Preparing QR…" })
        ] }) }),
        /* @__PURE__ */ e.jsxs(j, { gap: 8, style: { flex: 1, minWidth: 0 }, children: [
          /* @__PURE__ */ e.jsxs(j, { gap: 2, children: [
            /* @__PURE__ */ e.jsx("div", { style: { fontSize: 10.5, color: r.mute, textTransform: "uppercase", letterSpacing: 0.6 }, children: "Amount" }),
            /* @__PURE__ */ e.jsxs("div", { style: { fontSize: 18, fontWeight: 600, letterSpacing: -0.3 }, children: [
              $e(se),
              " ",
              H
            ] }),
            /* @__PURE__ */ e.jsxs("div", { style: { fontSize: 11, color: r.mute }, children: [
              "on ",
              T.name
            ] })
          ] }),
          /* @__PURE__ */ e.jsxs("div", { style: { fontSize: 10.5, color: r.mute, lineHeight: 1.4 }, children: [
            "Rate locked for ",
            /* @__PURE__ */ e.jsx("span", { style: { color: r.ink, fontWeight: 500 }, children: "9:42" })
          ] })
        ] })
      ] }),
      /* @__PURE__ */ e.jsxs(j, { gap: 6, children: [
        /* @__PURE__ */ e.jsx("div", { style: { fontSize: 11, color: r.mute, textTransform: "uppercase", letterSpacing: 0.6 }, children: "Deposit address" }),
        /* @__PURE__ */ e.jsxs("div", { style: {
          display: "flex",
          alignItems: "center",
          border: `1px solid ${r.hair}`,
          borderRadius: 10,
          background: "#fff",
          overflow: "hidden"
        }, children: [
          /* @__PURE__ */ e.jsx("div", { style: {
            flex: 1,
            padding: "10px 12px",
            fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
            fontSize: 12.5,
            color: z ? r.ink : r.mute,
            letterSpacing: -0.2,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap"
          }, children: p ? "Generating address…" : z || "—" }),
          /* @__PURE__ */ e.jsx("button", { onClick: he, disabled: !z, style: {
            height: 40,
            padding: "0 14px",
            border: "none",
            borderLeft: `1px solid ${r.hair}`,
            background: de ? r.accentSoft : "#fff",
            color: de ? r.accent : z ? r.ink : r.mute,
            fontSize: 12,
            fontWeight: 500,
            cursor: z ? "pointer" : "not-allowed",
            fontFamily: "inherit",
            display: "flex",
            alignItems: "center",
            gap: 6
          }, children: de ? /* @__PURE__ */ e.jsxs(e.Fragment, { children: [
            /* @__PURE__ */ e.jsx("svg", { width: "12", height: "12", viewBox: "0 0 24 24", fill: "none", children: /* @__PURE__ */ e.jsx("path", { d: "M5 12L10 17L19 7", stroke: "currentColor", strokeWidth: "2.5", strokeLinecap: "round", strokeLinejoin: "round" }) }),
            "Copied"
          ] }) : /* @__PURE__ */ e.jsxs(e.Fragment, { children: [
            /* @__PURE__ */ e.jsxs("svg", { width: "12", height: "12", viewBox: "0 0 24 24", fill: "none", children: [
              /* @__PURE__ */ e.jsx("rect", { x: "8", y: "8", width: "12", height: "12", rx: "2", stroke: "currentColor", strokeWidth: "2" }),
              /* @__PURE__ */ e.jsx("path", { d: "M16 8V5C16 4.45 15.55 4 15 4H5C4.45 4 4 4.45 4 5V15C4 15.55 4.45 16 5 16H8", stroke: "currentColor", strokeWidth: "2" })
            ] }),
            "Copy"
          ] }) })
        ] }),
        n && /* @__PURE__ */ e.jsxs(j, { gap: 6, children: [
          /* @__PURE__ */ e.jsx("div", { style: { fontSize: 11.5, color: r.err }, children: n }),
          /* @__PURE__ */ e.jsx(
            "button",
            {
              onClick: () => {
                X(!1), oe.current = null;
              },
              style: {
                alignSelf: "flex-start",
                padding: "6px 10px",
                borderRadius: 7,
                background: "transparent",
                border: `1px solid ${r.hair}`,
                cursor: "pointer",
                fontFamily: "inherit",
                fontSize: 11.5,
                color: r.ink
              },
              children: "Edit refund address"
            }
          )
        ] })
      ] }),
      (N || me) && /* @__PURE__ */ e.jsxs(j, { gap: 6, children: [
        /* @__PURE__ */ e.jsxs("div", { style: { fontSize: 11, color: r.mute, textTransform: "uppercase", letterSpacing: 0.6, display: "flex", alignItems: "center", gap: 6 }, children: [
          T.id === "XRP" ? "Destination tag" : "Memo",
          /* @__PURE__ */ e.jsx("span", { style: { fontSize: 10, color: r.warn, fontWeight: 600, letterSpacing: 0.4 }, children: "REQUIRED" })
        ] }),
        /* @__PURE__ */ e.jsxs("div", { style: {
          display: "flex",
          alignItems: "center",
          border: `1px solid ${r.hair}`,
          borderRadius: 10,
          background: "#fff",
          overflow: "hidden"
        }, children: [
          /* @__PURE__ */ e.jsx("div", { style: {
            flex: 1,
            padding: "10px 12px",
            fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
            fontSize: 12.5,
            color: N ? r.ink : r.mute,
            letterSpacing: -0.2,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap"
          }, children: p ? "Generating memo…" : N || "—" }),
          /* @__PURE__ */ e.jsx("button", { onClick: ve, disabled: !N, style: {
            height: 40,
            padding: "0 14px",
            border: "none",
            borderLeft: `1px solid ${r.hair}`,
            background: re ? r.accentSoft : "#fff",
            color: re ? r.accent : N ? r.ink : r.mute,
            fontSize: 12,
            fontWeight: 500,
            cursor: N ? "pointer" : "not-allowed",
            fontFamily: "inherit",
            display: "flex",
            alignItems: "center",
            gap: 6
          }, children: re ? /* @__PURE__ */ e.jsxs(e.Fragment, { children: [
            /* @__PURE__ */ e.jsx("svg", { width: "12", height: "12", viewBox: "0 0 24 24", fill: "none", children: /* @__PURE__ */ e.jsx("path", { d: "M5 12L10 17L19 7", stroke: "currentColor", strokeWidth: "2.5", strokeLinecap: "round", strokeLinejoin: "round" }) }),
            "Copied"
          ] }) : /* @__PURE__ */ e.jsxs(e.Fragment, { children: [
            /* @__PURE__ */ e.jsxs("svg", { width: "12", height: "12", viewBox: "0 0 24 24", fill: "none", children: [
              /* @__PURE__ */ e.jsx("rect", { x: "8", y: "8", width: "12", height: "12", rx: "2", stroke: "currentColor", strokeWidth: "2" }),
              /* @__PURE__ */ e.jsx("path", { d: "M16 8V5C16 4.45 15.55 4 15 4H5C4.45 4 4 4.45 4 5V15C4 15.55 4.45 16 5 16H8", stroke: "currentColor", strokeWidth: "2" })
            ] }),
            "Copy"
          ] }) })
        ] }),
        /* @__PURE__ */ e.jsxs("div", { style: { fontSize: 11, color: r.warn, lineHeight: 1.5 }, children: [
          "You must include this ",
          T.id === "XRP" ? "destination tag" : "memo",
          " when you send — without it the funds can't be credited and may be lost."
        ] })
      ] }),
      /* @__PURE__ */ e.jsxs("div", { style: {
        background: r.warnSoft,
        border: `1px solid ${r.warn}22`,
        borderRadius: 10,
        padding: "10px 12px",
        display: "flex",
        gap: 10,
        fontSize: 11.5,
        color: r.warn,
        lineHeight: 1.5
      }, children: [
        /* @__PURE__ */ e.jsxs("svg", { width: "14", height: "14", viewBox: "0 0 24 24", fill: "none", style: { flexShrink: 0, marginTop: 1 }, children: [
          /* @__PURE__ */ e.jsx("path", { d: "M12 2L2 20H22L12 2Z", stroke: "currentColor", strokeWidth: "1.8", strokeLinejoin: "round" }),
          /* @__PURE__ */ e.jsx("path", { d: "M12 10V13M12 16V16.01", stroke: "currentColor", strokeWidth: "1.8", strokeLinecap: "round" })
        ] }),
        /* @__PURE__ */ e.jsxs("span", { children: [
          "Only send ",
          /* @__PURE__ */ e.jsx("b", { children: T.token }),
          " on the ",
          /* @__PURE__ */ e.jsx("b", { children: T.name }),
          " network. Sending other assets or from a different network may result in loss."
        ] })
      ] }),
      /* @__PURE__ */ e.jsxs("div", { style: {
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "10px 12px",
        background: "#fff",
        border: `1px solid ${r.hair}`,
        borderRadius: 10
      }, children: [
        /* @__PURE__ */ e.jsxs("div", { style: { position: "relative", width: 10, height: 10 }, children: [
          /* @__PURE__ */ e.jsx("div", { style: { position: "absolute", inset: 0, borderRadius: 5, background: r.accent } }),
          /* @__PURE__ */ e.jsx("div", { style: { position: "absolute", inset: -3, borderRadius: 8, background: r.accent, opacity: 0.25, animation: "wpulse 1.6s ease-in-out infinite" } })
        ] }),
        /* @__PURE__ */ e.jsxs("div", { style: { flex: 1, fontSize: 12, color: r.ink2 }, children: [
          "Watching for deposit on ",
          T.name,
          "…"
        ] }),
        /* @__PURE__ */ e.jsx("button", { onClick: () => o && l("processing"), disabled: !o, style: {
          fontSize: 11,
          color: o ? r.mute : r.hair,
          background: "transparent",
          border: "none",
          cursor: o ? "pointer" : "not-allowed",
          fontFamily: "inherit",
          textDecoration: "underline"
        }, children: "Simulate" })
      ] })
    ] }) : /* @__PURE__ */ e.jsxs(j, { gap: 10, children: [
      /* @__PURE__ */ e.jsxs(j, { gap: 6, children: [
        /* @__PURE__ */ e.jsxs("label", { style: { fontSize: 10.5, color: r.mute, textTransform: "uppercase", letterSpacing: 0.6 }, children: [
          "Your refund wallet on ",
          T.name
        ] }),
        /* @__PURE__ */ e.jsx(
          "input",
          {
            autoFocus: !0,
            placeholder: On[T.id] ?? "Paste your wallet address",
            value: S,
            onChange: (C) => I(C.target.value),
            onKeyDown: (C) => {
              C.key === "Enter" && ye();
            },
            style: {
              width: "100%",
              boxSizing: "border-box",
              padding: "11px 14px",
              borderRadius: 10,
              border: `1px solid ${r.hair}`,
              background: "#fff",
              fontSize: 13,
              fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
              color: r.ink,
              outline: "none",
              letterSpacing: -0.2
            }
          }
        ),
        /* @__PURE__ */ e.jsxs("div", { style: { fontSize: 11, color: r.mute, lineHeight: 1.5 }, children: [
          "If the swap fails or you send the wrong amount, funds are returned to this address. Must be a valid address on ",
          /* @__PURE__ */ e.jsx("b", { children: T.name }),
          "."
        ] })
      ] }),
      /* @__PURE__ */ e.jsx(
        "button",
        {
          onClick: ye,
          disabled: !S.trim(),
          style: {
            ...Pe,
            opacity: S.trim() ? 1 : 0.5,
            cursor: S.trim() ? "pointer" : "not-allowed"
          },
          children: "Generate deposit address"
        }
      )
    ] }) : /* @__PURE__ */ e.jsx("div", { style: {
      background: r.panel,
      border: `1px dashed ${r.hair}`,
      borderRadius: 12,
      padding: "28px 16px",
      textAlign: "center",
      fontSize: 12.5,
      color: r.mute,
      lineHeight: 1.5
    }, children: "Pick a network above to generate your deposit address." })
  ] });
}
const Xt = {
  NGN: [
    { code: "GTBINGLA", name: "Guaranty Trust Bank" },
    { code: "FBNINGLA", name: "First Bank of Nigeria" },
    { code: "ZEIBNGLA", name: "Zenith Bank" },
    { code: "ABNGNGLA", name: "Access Bank" },
    { code: "UBNINGLA", name: "Union Bank" },
    { code: "STBKNGLA", name: "Stanbic IBTC Bank" },
    { code: "FCMBNGLA", name: "First City Monument Bank" },
    { code: "FIDTNGLA", name: "Fidelity Bank" },
    { code: "ECOBNGLA", name: "Ecobank Nigeria" },
    { code: "WEMANGLA", name: "Wema Bank" },
    { code: "KUDANGPC", name: "Kuda Bank" },
    { code: "OPAYNGPC", name: "OPay" },
    { code: "MONINGPC", name: "Moniepoint" }
  ]
}, ht = {
  width: "100%",
  padding: "11px 14px",
  borderRadius: 10,
  border: `1px solid ${r.hair}`,
  background: "#fff",
  fontSize: 14,
  fontWeight: 500,
  color: r.ink,
  fontFamily: "inherit",
  outline: "none",
  boxSizing: "border-box"
};
function Wn({
  merchant: l,
  value: i,
  onChange: c,
  onSubmit: h,
  submitting: g,
  error: a
}) {
  const k = Xt[l.currency] ?? [], p = i.institution.length > 0 && i.accountIdentifier.trim().length >= 8 && i.accountName.trim().length >= 2;
  return /* @__PURE__ */ e.jsxs(j, { gap: 14, style: { padding: "16px 20px 6px" }, children: [
    /* @__PURE__ */ e.jsxs(j, { gap: 4, children: [
      /* @__PURE__ */ e.jsx("div", { style: { fontSize: 18, fontWeight: 600, letterSpacing: -0.3 }, children: "Where should refunds go?" }),
      /* @__PURE__ */ e.jsx("div", { style: { fontSize: 12.5, color: r.mute, lineHeight: 1.5 }, children: "If your payment can't be matched, we'll return the funds to this account. Must be in your name." })
    ] }),
    /* @__PURE__ */ e.jsxs(j, { gap: 10, children: [
      /* @__PURE__ */ e.jsxs(j, { gap: 6, children: [
        /* @__PURE__ */ e.jsx("label", { style: { fontSize: 10.5, color: r.mute, textTransform: "uppercase", letterSpacing: 0.6 }, children: "Bank" }),
        /* @__PURE__ */ e.jsxs(
          "select",
          {
            value: i.institution,
            onChange: (n) => c({ ...i, institution: n.target.value }),
            style: { ...ht, appearance: "none", backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 24 24' fill='none'><path d='M6 9L12 15L18 9' stroke='%236B7572' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'/></svg>")`, backgroundRepeat: "no-repeat", backgroundPosition: "right 12px center", paddingRight: 36 },
            children: [
              /* @__PURE__ */ e.jsx("option", { value: "", disabled: !0, children: "Select your bank…" }),
              k.map((n) => /* @__PURE__ */ e.jsx("option", { value: n.code, children: n.name }, n.code))
            ]
          }
        )
      ] }),
      /* @__PURE__ */ e.jsxs(j, { gap: 6, children: [
        /* @__PURE__ */ e.jsx("label", { style: { fontSize: 10.5, color: r.mute, textTransform: "uppercase", letterSpacing: 0.6 }, children: "Account number" }),
        /* @__PURE__ */ e.jsx(
          "input",
          {
            inputMode: "numeric",
            placeholder: "0123456789",
            value: i.accountIdentifier,
            onChange: (n) => c({ ...i, accountIdentifier: n.target.value.replace(/\D/g, "") }),
            style: { ...ht, fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", letterSpacing: -0.2 }
          }
        )
      ] }),
      /* @__PURE__ */ e.jsxs(j, { gap: 6, children: [
        /* @__PURE__ */ e.jsx("label", { style: { fontSize: 10.5, color: r.mute, textTransform: "uppercase", letterSpacing: 0.6 }, children: "Account name" }),
        /* @__PURE__ */ e.jsx(
          "input",
          {
            placeholder: "Full name as it appears on your account",
            value: i.accountName,
            onChange: (n) => c({ ...i, accountName: n.target.value }),
            style: ht
          }
        )
      ] })
    ] }),
    /* @__PURE__ */ e.jsxs("div", { style: {
      background: r.panel,
      border: `1px solid ${r.hair}`,
      borderRadius: 10,
      padding: "10px 12px",
      display: "flex",
      gap: 10,
      fontSize: 11.5,
      color: r.ink2,
      lineHeight: 1.5
    }, children: [
      /* @__PURE__ */ e.jsxs("svg", { width: "14", height: "14", viewBox: "0 0 24 24", fill: "none", style: { flexShrink: 0, marginTop: 1, color: r.mute }, children: [
        /* @__PURE__ */ e.jsx("circle", { cx: "12", cy: "12", r: "10", stroke: "currentColor", strokeWidth: "1.8" }),
        /* @__PURE__ */ e.jsx("path", { d: "M12 8V13M12 16V16.01", stroke: "currentColor", strokeWidth: "1.8", strokeLinecap: "round" })
      ] }),
      /* @__PURE__ */ e.jsx("span", { children: "We only use this account if the payment fails. Refunds arrive within 1 business day." })
    ] }),
    a && /* @__PURE__ */ e.jsx("div", { style: {
      background: "#FBEEE9",
      border: `1px solid ${r.err}33`,
      borderRadius: 10,
      padding: "10px 12px",
      fontSize: 12,
      color: r.err,
      lineHeight: 1.5
    }, children: a }),
    /* @__PURE__ */ e.jsx(
      "button",
      {
        onClick: h,
        disabled: !p || g,
        style: { ...Pe, opacity: p && !g ? 1 : 0.5, cursor: p && !g ? "pointer" : "not-allowed" },
        children: g ? "Creating payment…" : "Continue"
      }
    )
  ] });
}
const Un = {
  NGN: { bank: "Wema Bank", accountNumber: "8203 7461 92", accountName: "Weave / Afriloom-0481" }
};
function qt(l, i) {
  const c = (Xt[l] ?? []).find((h) => h.code === i);
  return (c == null ? void 0 : c.name) ?? i;
}
function $n({
  onNext: l,
  merchant: i,
  bankDetails: c,
  apiKey: h,
  orderId: g
}) {
  const a = ie[i.currency], k = c ? {
    bank: qt(i.currency, c.institution),
    accountNumber: c.accountIdentifier,
    accountName: c.accountName
  } : Un[i.currency], p = c != null && c.amountToTransfer ? (() => {
    const m = c.amountToTransfer, E = m.includes(".") ? m.split(".")[1].length : 0;
    return pe(Number(m), i.currency, E);
  })() : pe(i.amount, i.currency), [n, s] = L(null), [o, d] = L(9), [u, x] = L(42);
  Ce(() => {
    const m = setInterval(() => {
      x((E) => E > 0 ? E - 1 : (d((v) => Math.max(0, v - 1)), 59));
    }, 1e3);
    return () => clearInterval(m);
  }, []), Ce(() => {
    if (!g) return;
    let m = !1, E;
    const v = async () => {
      if (!m) {
        try {
          const S = await Ze(h, g), I = String(S.status ?? "").toLowerCase();
          if (I && I !== "awaiting_deposit") {
            m = !0, I === "completed" ? l("success") : ["failed", "refunded"].includes(I) ? l("error") : l("processing");
            return;
          }
        } catch {
        }
        E = setTimeout(v, 5e3);
      }
    };
    return v(), () => {
      m = !0, clearTimeout(E);
    };
  }, [h, g, l]);
  const y = (m, E) => {
    var v;
    (v = navigator.clipboard) == null || v.writeText(E), s(m), setTimeout(() => s(null), 1400);
  }, b = ({ label: m, value: E, k: v, mono: S = !0 }) => /* @__PURE__ */ e.jsxs(Y, { justify: "space-between", style: { padding: "11px 14px" }, children: [
    /* @__PURE__ */ e.jsxs(j, { gap: 2, style: { minWidth: 0 }, children: [
      /* @__PURE__ */ e.jsx("div", { style: { fontSize: 10.5, color: r.mute, textTransform: "uppercase", letterSpacing: 0.6 }, children: m }),
      /* @__PURE__ */ e.jsx("div", { style: {
        fontSize: 14,
        fontWeight: 500,
        color: r.ink,
        fontFamily: S ? "ui-monospace, SFMono-Regular, Menlo, monospace" : "inherit",
        letterSpacing: S ? -0.2 : 0,
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap"
      }, children: E })
    ] }),
    /* @__PURE__ */ e.jsx("button", { onClick: () => y(v, E), style: {
      height: 28,
      padding: "0 10px",
      borderRadius: 7,
      border: `1px solid ${r.hair}`,
      background: n === v ? r.accentSoft : "#fff",
      color: n === v ? r.accent : r.ink,
      fontSize: 11.5,
      fontWeight: 500,
      cursor: "pointer",
      fontFamily: "inherit",
      display: "flex",
      alignItems: "center",
      gap: 5
    }, children: n === v ? /* @__PURE__ */ e.jsxs(e.Fragment, { children: [
      /* @__PURE__ */ e.jsx("svg", { width: "10", height: "10", viewBox: "0 0 24 24", fill: "none", children: /* @__PURE__ */ e.jsx("path", { d: "M5 12L10 17L19 7", stroke: "currentColor", strokeWidth: "3", strokeLinecap: "round", strokeLinejoin: "round" }) }),
      "Copied"
    ] }) : "Copy" })
  ] });
  return /* @__PURE__ */ e.jsxs(j, { gap: 14, style: { padding: "16px 20px 6px" }, children: [
    /* @__PURE__ */ e.jsxs(j, { gap: 4, children: [
      /* @__PURE__ */ e.jsxs(Y, { justify: "space-between", align: "flex-start", children: [
        /* @__PURE__ */ e.jsxs("div", { style: { fontSize: 18, fontWeight: 600, letterSpacing: -0.3 }, children: [
          "Send ",
          p
        ] }),
        /* @__PURE__ */ e.jsxs(xt, { tone: "warn", children: [
          /* @__PURE__ */ e.jsxs("svg", { width: "10", height: "10", viewBox: "0 0 24 24", fill: "none", style: { marginRight: 2 }, children: [
            /* @__PURE__ */ e.jsx("circle", { cx: "12", cy: "12", r: "10", stroke: "currentColor", strokeWidth: "2" }),
            /* @__PURE__ */ e.jsx("path", { d: "M12 7V12L15 14", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round" })
          ] }),
          o,
          ":",
          String(u).padStart(2, "0")
        ] })
      ] }),
      /* @__PURE__ */ e.jsx("div", { style: { fontSize: 12.5, color: r.mute, lineHeight: 1.5 }, children: "Open your bank app and transfer to this account. We'll confirm your payment automatically — no need to send proof." })
    ] }),
    /* @__PURE__ */ e.jsxs("div", { style: { background: "#fff", border: `1px solid ${r.hair}`, borderRadius: 12, overflow: "hidden" }, children: [
      /* @__PURE__ */ e.jsxs(Y, { gap: 10, style: { padding: "12px 14px", background: r.panel, borderBottom: `1px solid ${r.hair}` }, children: [
        /* @__PURE__ */ e.jsx("div", { style: { width: 28, height: 28, borderRadius: 14, background: "#fff", border: `1px solid ${r.hair}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 600, color: r.ink }, children: a.flag }),
        /* @__PURE__ */ e.jsxs(j, { gap: 1, style: { flex: 1 }, children: [
          /* @__PURE__ */ e.jsx("div", { style: { fontSize: 13, fontWeight: 500 }, children: k.bank }),
          /* @__PURE__ */ e.jsxs("div", { style: { fontSize: 11, color: r.mute }, children: [
            "Virtual account · one-time · ",
            i.currency
          ] })
        ] })
      ] }),
      /* @__PURE__ */ e.jsx(b, { label: "Account number", value: k.accountNumber, k: "acc" }),
      /* @__PURE__ */ e.jsx(Oe, {}),
      /* @__PURE__ */ e.jsx(b, { label: "Account name", value: k.accountName, k: "name", mono: !1 }),
      /* @__PURE__ */ e.jsx(Oe, {}),
      /* @__PURE__ */ e.jsx(b, { label: "Amount", value: p, k: "amt", mono: !1 })
    ] }),
    /* @__PURE__ */ e.jsxs("div", { style: {
      background: r.warnSoft,
      border: `1px solid ${r.warn}22`,
      borderRadius: 10,
      padding: "10px 12px",
      display: "flex",
      gap: 10,
      fontSize: 11.5,
      color: r.warn,
      lineHeight: 1.5
    }, children: [
      /* @__PURE__ */ e.jsxs("svg", { width: "14", height: "14", viewBox: "0 0 24 24", fill: "none", style: { flexShrink: 0, marginTop: 1 }, children: [
        /* @__PURE__ */ e.jsx("path", { d: "M12 2L2 20H22L12 2Z", stroke: "currentColor", strokeWidth: "1.8", strokeLinejoin: "round" }),
        /* @__PURE__ */ e.jsx("path", { d: "M12 10V13M12 16V16.01", stroke: "currentColor", strokeWidth: "1.8", strokeLinecap: "round" })
      ] }),
      /* @__PURE__ */ e.jsx("span", { children: "Send the exact amount. Any difference may delay delivery." })
    ] }),
    /* @__PURE__ */ e.jsxs("div", { style: {
      display: "flex",
      alignItems: "center",
      gap: 10,
      padding: "10px 12px",
      background: "#fff",
      border: `1px solid ${r.hair}`,
      borderRadius: 10
    }, children: [
      /* @__PURE__ */ e.jsxs("div", { style: { position: "relative", width: 10, height: 10 }, children: [
        /* @__PURE__ */ e.jsx("div", { style: { position: "absolute", inset: 0, borderRadius: 5, background: r.accent } }),
        /* @__PURE__ */ e.jsx("div", { style: { position: "absolute", inset: -3, borderRadius: 8, background: r.accent, opacity: 0.25, animation: "wpulse 1.6s ease-in-out infinite" } })
      ] }),
      /* @__PURE__ */ e.jsx("div", { style: { flex: 1, fontSize: 12, color: r.ink2 }, children: "Waiting for your transfer… this usually takes under a minute." }),
      /* @__PURE__ */ e.jsx("button", { onClick: () => l("processing"), style: {
        fontSize: 11,
        color: r.mute,
        background: "transparent",
        border: "none",
        cursor: "pointer",
        fontFamily: "inherit",
        textDecoration: "underline"
      }, children: "Simulate" })
    ] })
  ] });
}
const Hn = {
  name: "Afriloom Textiles",
  amount: 700,
  currency: "NGN"
}, Dt = {
  Base: "BASE",
  Optimism: "OPTIMISM",
  Ethereum: "ETHEREUM",
  Arbitrum: "ARBITRUM",
  Polygon: "POLYGON"
};
function Kn({
  merchant: l = Hn,
  apiKey: i,
  userAddress: c,
  theme: h = "organic",
  borderRadius: g = 16,
  accentColor: a,
  onSuccess: k,
  onError: p,
  onClose: n
}) {
  const s = i ?? (typeof window < "u" ? window.__WEAVE_API_KEY__ : void 0) ?? "pk_live_5d1f7192387560bdd31897ee4687e05bf88150c8ffb73218" ?? "pk_test_demo", o = c ?? "0x2B4fB6F7255DeF56d985fb01134ab1431Efbd3be" ?? "0x0000000000000000000000000000000000000000", [d, u] = L("connect"), [x, y] = L("offramp"), [b, m] = L(0), [E, v] = L(!1), [S, I] = L({
    institution: "",
    accountIdentifier: "",
    accountName: ""
  }), [P, X] = L(null), [de, J] = L(null), [re, ee] = L(null), [V, T] = L(null), [z, N] = L(null), [H, ge] = L(null), [se, ue] = L(null), [oe, me] = L(!1), [ye, he] = L(null), [ve, C] = L(null), [G, be] = L(!1), [fe, te] = L(!1), [Se, ae] = L(null), je = Ke(0), xe = Ke(0), Je = (D) => {
    ae(null), X(null), ee(null), T(null), he(null), J(null), C(null), D === "fiat" ? (y("onramp"), u("refundAccount")) : D === "crypto" ? (y("offramp"), u("wallet")) : D === "deposit" && (y("offramp"), u("deposit"));
  }, et = async (D, K, q) => {
    const Ie = ++je.current;
    me(!0), he(null), ee(null), T(null), N(null), ge(null), ue(null);
    try {
      const we = at(D, K), Re = Ye(l.currency), bt = await lt(s, {
        from: we,
        to: Re,
        amount: l.amount,
        amountIn: "dest"
      }), ke = await ct(s, {
        source: {
          inline: { kind: "crypto_wallet", assetKey: we, walletAddress: "" }
        },
        // The backend uses exact math to derive the sourceAmount and fed straight into NEAR Intents.
        amount: l.amount,
        amountIn: "dest",
        refundAddress: q
      });
      if (je.current !== Ie) return;
      X(ke.order.id), ee(ke.nextAction.depositAddress ?? null), T(ke.nextAction.depositMemo ?? null), N(typeof ke.nextAction.amount == "number" ? ke.nextAction.amount : null), ge(ke.nextAction.token ?? K), ue(ke.nextAction.chain ?? D);
    } catch (we) {
      if (je.current !== Ie) return;
      he(we.message ?? "Could not generate a deposit address"), p == null || p(we);
    } finally {
      je.current === Ie && me(!1);
    }
  }, Be = async () => {
    u("quote");
    const D = Ve[b ?? 0], K = ++xe.current;
    be(!0), C(null);
    try {
      const q = await lt(s, {
        from: at(Dt[D.chain] ?? D.chain, D.token),
        to: Ye(l.currency),
        amount: l.amount,
        amountIn: "dest"
      });
      if (xe.current !== K) return;
      C({
        estimatedFiat: q.estimatedDest,
        netUsdc: q.breakdown.netUsd,
        fiatCurrency: l.currency,
        breakdown: {
          inputAmount: q.breakdown.usdEquivalent,
          inputToken: D.token,
          fastPath: q.route.steps.length === 1,
          bridgeFeeUsd: q.breakdown.bridgeFeeUsd,
          senderFeeUsd: q.breakdown.senderFeeUsd,
          appFeeUsd: q.breakdown.appFeeUsd,
          sellRate: q.breakdown.sellRate ?? 0
        }
      });
    } catch {
    } finally {
      xe.current === K && be(!1);
    }
  }, le = (D) => {
    D === "success" && k && P && k({ orderId: P, status: "completed" }), u(D);
  }, He = async () => {
    te(!0), ae(null);
    try {
      const D = {
        inline: {
          kind: "bank_account",
          assetKey: Ye(l.currency),
          bankInstitution: S.institution,
          bankAccountIdentifier: S.accountIdentifier,
          bankAccountName: S.accountName
        }
      }, K = await ct(s, { source: D, amount: l.amount });
      X(K.order.id), J(K.nextAction.bankDetails ?? null), u("vaccount");
    } catch (D) {
      ae(D.message ?? "Failed to create order"), p == null || p(D);
    } finally {
      te(!1);
    }
  }, Ge = async () => {
    const D = Ve[b ?? 0];
    te(!0), ae(null);
    try {
      const K = at(Dt[D.chain] ?? D.chain, D.token), q = Ye(l.currency), Ie = await lt(s, {
        from: K,
        to: q,
        amount: l.amount,
        amountIn: "dest"
      }), Re = await ct(s, { source: {
        inline: { kind: "crypto_wallet", assetKey: K, walletAddress: o }
      }, amount: l.amount, amountIn: "dest" });
      X(Re.order.id), ee(Re.nextAction.depositAddress ?? null), u("processing");
    } catch (K) {
      ae(K.message ?? "Failed to create order"), p == null || p(K);
    } finally {
      te(!1);
    }
  };
  if (E)
    return /* @__PURE__ */ e.jsxs("div", { style: {
      position: "absolute",
      bottom: 24,
      right: 24,
      zIndex: 10,
      background: r.ink,
      color: "#fff",
      padding: "10px 16px",
      borderRadius: 999,
      fontSize: 13,
      display: "flex",
      alignItems: "center",
      gap: 8,
      cursor: "pointer",
      boxShadow: "0 10px 30px rgba(0,0,0,0.25)"
    }, onClick: () => v(!1), children: [
      /* @__PURE__ */ e.jsx(yt, { size: 16 }),
      "Pay with Weave"
    ] });
  const Ee = Ve[b ?? 0], ze = x === "onramp", Le = (D) => {
    X(null), ae(null), J(null), ee(null), T(null), he(null), C(null), u(D);
  }, _e = (() => {
    if (d === "connect") return /* @__PURE__ */ e.jsx(Fn, { onPick: Je, merchant: l });
    if (ze) {
      if (d === "refundAccount") return /* @__PURE__ */ e.jsx(Wn, { merchant: l, value: S, onChange: I, onSubmit: He, submitting: fe, error: Se });
      if (d === "vaccount") return /* @__PURE__ */ e.jsx($n, { onNext: le, merchant: l, bankDetails: de, apiKey: s, orderId: P });
      if (d === "processing") return /* @__PURE__ */ e.jsx(Lt, { onNext: le, merchant: l, mode: "fiat", apiKey: s, orderId: P, bankDetails: de });
      if (d === "success") return /* @__PURE__ */ e.jsx(It, { onNext: le, balance: Ee, merchant: l, direction: x, apiKey: s, orderId: P, accentColor: a });
      if (d === "error") return /* @__PURE__ */ e.jsx(Mt, { onNext: () => Le("connect"), onBack: () => Le("refundAccount") });
    } else {
      if (d === "deposit") return /* @__PURE__ */ e.jsx(_n, { onNext: le, merchant: l, depositAddress: re, depositMemo: V, amountToSend: z, sourceToken: H, sourceChain: se, loading: oe, error: ye, onChainChange: et, ready: !!P && !!re && !oe, apiKey: s, orderId: P });
      if (d === "wallet") return /* @__PURE__ */ e.jsx(Bn, { onNext: () => Be(), merchant: l, balances: Ve, selected: b, setSelected: m });
      if (d === "quote") return /* @__PURE__ */ e.jsx(Ln, { merchant: l, balance: Ee, onConfirm: Ge, submitting: fe, error: Se, quote: ve, quoteLoading: G });
      if (d === "processing") return /* @__PURE__ */ e.jsx(Lt, { onNext: le, merchant: l, mode: "crypto", apiKey: s, orderId: P });
      if (d === "success") return /* @__PURE__ */ e.jsx(It, { onNext: le, balance: Ee, merchant: l, direction: x, apiKey: s, orderId: P, accentColor: a });
      if (d === "error") return /* @__PURE__ */ e.jsx(Mt, { onNext: () => Le("connect"), onBack: () => Le("quote") });
    }
    return null;
  })(), tt = ["wallet", "quote", "deposit"].includes(d) && !ze || ["refundAccount", "vaccount"].includes(d) && ze, nt = d === "quote" ? "wallet" : d === "vaccount" ? "refundAccount" : "connect";
  return /* @__PURE__ */ e.jsxs(
    "div",
    {
      className: `weave-checkout weave-theme-${h}`,
      style: {
        "--weave-accent": qe[a] || a || "#0F5D4C",
        "--weave-accent-soft": (qe[a] || a || "#0F5D4C") + "15",
        width: 400,
        background: r.surface,
        borderRadius: g,
        boxShadow: "0 30px 80px rgba(11, 15, 14, 0.22), 0 0 0 1px rgba(0,0,0,0.04)",
        overflow: "hidden",
        fontFamily: "Inter, -apple-system, BlinkMacSystemFont, sans-serif",
        color: r.ink,
        animation: "wslide 0.35s cubic-bezier(0.2, 1, 0.3, 1)"
      },
      children: [
        /* @__PURE__ */ e.jsx(
          Rn,
          {
            merchantName: l.name,
            onClose: () => {
              v(!0), n == null || n();
            },
            showBack: tt,
            onBack: () => u(nt)
          }
        ),
        /* @__PURE__ */ e.jsx("div", { style: { animation: "wfade 0.25s ease" }, children: _e }, d),
        /* @__PURE__ */ e.jsx(Tn, {})
      ]
    }
  );
}
const Q = {
  ink: "#0B0F0E",
  ink2: "#3A4240",
  mute: "#6B7572",
  hair: "#E8EAE6",
  page: "#F5F4EF"
}, Gn = { NGN: "₦" }, Qe = (l, i) => `${Gn[i] ?? ""}${new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(l)}`;
function Xn({ currency: l = "NGN", amount: i = 15e4 }) {
  const c = [
    { name: "Ẹ̀wà Handwoven Throw", sub: "Indigo / 150 × 200cm", price: 12e4 },
    { name: "Aso-Oke Runner", sub: "Earth / 35 × 180cm", price: 25e3 }
  ];
  return /* @__PURE__ */ e.jsxs("div", { style: {
    position: "absolute",
    inset: 0,
    background: Q.page,
    fontFamily: "Inter, -apple-system, sans-serif",
    color: Q.ink,
    overflow: "hidden"
  }, children: [
    /* @__PURE__ */ e.jsxs("div", { style: {
      height: 56,
      padding: "0 32px",
      borderBottom: `1px solid ${Q.hair}`,
      display: "flex",
      alignItems: "center",
      background: "#fff"
    }, children: [
      /* @__PURE__ */ e.jsxs("div", { style: { display: "flex", alignItems: "center", gap: 10 }, children: [
        /* @__PURE__ */ e.jsx("div", { style: {
          width: 26,
          height: 26,
          borderRadius: 6,
          background: "#2B1810",
          color: "#F5DEB3",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontWeight: 700,
          fontSize: 13,
          fontFamily: "Georgia, serif"
        }, children: "A" }),
        /* @__PURE__ */ e.jsx("span", { style: { fontWeight: 600, fontSize: 14, letterSpacing: -0.1 }, children: "Afriloom" }),
        /* @__PURE__ */ e.jsx("span", { style: { color: Q.mute, fontSize: 13, marginLeft: 16 }, children: "Shop · Journal · About" })
      ] }),
      /* @__PURE__ */ e.jsxs("div", { style: { marginLeft: "auto", display: "flex", gap: 14, fontSize: 13, color: Q.ink2 }, children: [
        /* @__PURE__ */ e.jsx("span", { children: "Search" }),
        /* @__PURE__ */ e.jsx("span", { children: "Account" }),
        /* @__PURE__ */ e.jsx("span", { children: "Cart (2)" })
      ] })
    ] }),
    /* @__PURE__ */ e.jsxs("div", { style: { display: "flex", padding: "32px 32px", gap: 40, height: "calc(100% - 56px)" }, children: [
      /* @__PURE__ */ e.jsxs("div", { style: { flex: "0 0 340px" }, children: [
        /* @__PURE__ */ e.jsx("div", { style: { fontSize: 11, color: Q.mute, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 14 }, children: "Order summary" }),
        c.map((h, g) => /* @__PURE__ */ e.jsxs("div", { style: { display: "flex", gap: 14, padding: "12px 0", borderBottom: `1px solid ${Q.hair}` }, children: [
          /* @__PURE__ */ e.jsx("div", { style: {
            width: 60,
            height: 72,
            borderRadius: 6,
            flexShrink: 0,
            background: g === 0 ? "repeating-linear-gradient(90deg, #2D3E60 0 6px, #1F2D45 6px 12px, #3A4F75 12px 16px)" : "repeating-linear-gradient(0deg, #8B6D47 0 4px, #6B5236 4px 8px, #A8855D 8px 14px)"
          } }),
          /* @__PURE__ */ e.jsxs("div", { style: { flex: 1, fontSize: 12.5 }, children: [
            /* @__PURE__ */ e.jsx("div", { style: { fontWeight: 500 }, children: h.name }),
            /* @__PURE__ */ e.jsx("div", { style: { color: Q.mute, fontSize: 11.5, marginTop: 2 }, children: h.sub }),
            /* @__PURE__ */ e.jsx("div", { style: { marginTop: 4 }, children: Qe(h.price, l) })
          ] })
        ] }, g)),
        /* @__PURE__ */ e.jsxs("div", { style: { padding: "12px 0", fontSize: 12.5, display: "flex", flexDirection: "column", gap: 6 }, children: [
          /* @__PURE__ */ e.jsxs("div", { style: { display: "flex", justifyContent: "space-between", color: Q.mute }, children: [
            /* @__PURE__ */ e.jsx("span", { children: "Subtotal" }),
            /* @__PURE__ */ e.jsx("span", { children: Qe(145e3, l) })
          ] }),
          /* @__PURE__ */ e.jsxs("div", { style: { display: "flex", justifyContent: "space-between", color: Q.mute }, children: [
            /* @__PURE__ */ e.jsx("span", { children: "Shipping" }),
            /* @__PURE__ */ e.jsx("span", { children: Qe(5e3, l) })
          ] }),
          /* @__PURE__ */ e.jsxs("div", { style: { display: "flex", justifyContent: "space-between", fontWeight: 600, fontSize: 14, marginTop: 6, color: Q.ink }, children: [
            /* @__PURE__ */ e.jsx("span", { children: "Total" }),
            /* @__PURE__ */ e.jsx("span", { children: Qe(i, l) })
          ] })
        ] })
      ] }),
      /* @__PURE__ */ e.jsxs("div", { style: { flex: 1, maxWidth: 440 }, children: [
        /* @__PURE__ */ e.jsx("div", { style: { fontSize: 11, color: Q.mute, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 14 }, children: "Payment" }),
        /* @__PURE__ */ e.jsxs("div", { style: { display: "flex", flexDirection: "column", gap: 10, opacity: 0.4 }, children: [
          /* @__PURE__ */ e.jsx("div", { style: { height: 42, border: `1px solid ${Q.hair}`, borderRadius: 8, background: "#fff", display: "flex", alignItems: "center", padding: "0 14px", fontSize: 13, color: Q.mute }, children: "Email" }),
          /* @__PURE__ */ e.jsx("div", { style: { height: 42, border: `1px solid ${Q.hair}`, borderRadius: 8, background: "#fff", display: "flex", alignItems: "center", padding: "0 14px", fontSize: 13, color: Q.mute }, children: "Card number" }),
          /* @__PURE__ */ e.jsxs("div", { style: { display: "flex", gap: 10 }, children: [
            /* @__PURE__ */ e.jsx("div", { style: { flex: 1, height: 42, border: `1px solid ${Q.hair}`, borderRadius: 8, background: "#fff" } }),
            /* @__PURE__ */ e.jsx("div", { style: { flex: 1, height: 42, border: `1px solid ${Q.hair}`, borderRadius: 8, background: "#fff" } })
          ] })
        ] })
      ] })
    ] }),
    /* @__PURE__ */ e.jsx("div", { style: {
      position: "absolute",
      inset: 0,
      background: "rgba(11, 15, 14, 0.35)",
      backdropFilter: "blur(1px)"
    } })
  ] });
}
export {
  Xn as MerchantBackdrop,
  Kn as WeaveCheckout
};
