import _, { useState as F, useRef as Qe, useEffect as Le } from "react";
var ut = { exports: {} }, We = {};
/**
 * @license React
 * react-jsx-runtime.production.min.js
 *
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
var Et;
function pn() {
  if (Et) return We;
  Et = 1;
  var a = _, s = Symbol.for("react.element"), l = Symbol.for("react.fragment"), f = Object.prototype.hasOwnProperty, g = a.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED.ReactCurrentOwner, u = { key: !0, ref: !0, __self: !0, __source: !0 };
  function y(m, t, o) {
    var i, c = {}, d = null, x = null;
    o !== void 0 && (d = "" + o), t.key !== void 0 && (d = "" + t.key), t.ref !== void 0 && (x = t.ref);
    for (i in t) f.call(t, i) && !u.hasOwnProperty(i) && (c[i] = t[i]);
    if (m && m.defaultProps) for (i in t = m.defaultProps, t) c[i] === void 0 && (c[i] = t[i]);
    return { $$typeof: s, type: m, key: d, ref: x, props: c, _owner: g.current };
  }
  return We.Fragment = l, We.jsx = y, We.jsxs = y, We;
}
var _e = {};
/**
 * @license React
 * react-jsx-runtime.development.js
 *
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
var Rt;
function gn() {
  return Rt || (Rt = 1, process.env.NODE_ENV !== "production" && function() {
    var a = _, s = Symbol.for("react.element"), l = Symbol.for("react.portal"), f = Symbol.for("react.fragment"), g = Symbol.for("react.strict_mode"), u = Symbol.for("react.profiler"), y = Symbol.for("react.provider"), m = Symbol.for("react.context"), t = Symbol.for("react.forward_ref"), o = Symbol.for("react.suspense"), i = Symbol.for("react.suspense_list"), c = Symbol.for("react.memo"), d = Symbol.for("react.lazy"), x = Symbol.for("react.offscreen"), h = Symbol.iterator, b = "@@iterator";
    function k(n) {
      if (n === null || typeof n != "object")
        return null;
      var p = h && n[h] || n[b];
      return typeof p == "function" ? p : null;
    }
    var C = a.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED;
    function j(n) {
      {
        for (var p = arguments.length, v = new Array(p > 1 ? p - 1 : 0), E = 1; E < p; E++)
          v[E - 1] = arguments[E];
        w("error", n, v);
      }
    }
    function w(n, p, v) {
      {
        var E = C.ReactDebugCurrentFrame, B = E.getStackAddendum();
        B !== "" && (p += "%s", v = v.concat([B]));
        var P = v.map(function(M) {
          return String(M);
        });
        P.unshift("Warning: " + p), Function.prototype.apply.call(console[n], console, P);
      }
    }
    var I = !1, G = !1, K = !1, he = !1, q = !1, ae;
    ae = Symbol.for("react.module.reference");
    function fe(n) {
      return !!(typeof n == "string" || typeof n == "function" || n === f || n === u || q || n === g || n === o || n === i || he || n === x || I || G || K || typeof n == "object" && n !== null && (n.$$typeof === d || n.$$typeof === c || n.$$typeof === y || n.$$typeof === m || n.$$typeof === t || // This needs to include all possible module reference object
      // types supported by any Flight configuration anywhere since
      // we don't know which Flight build this will end up being used
      // with.
      n.$$typeof === ae || n.getModuleId !== void 0));
    }
    function Y(n, p, v) {
      var E = n.displayName;
      if (E)
        return E;
      var B = p.displayName || p.name || "";
      return B !== "" ? v + "(" + B + ")" : v;
    }
    function L(n) {
      return n.displayName || "Context";
    }
    function z(n) {
      if (n == null)
        return null;
      if (typeof n.tag == "number" && j("Received an unexpected object in getComponentNameFromType(). This is likely a bug in React. Please file an issue."), typeof n == "function")
        return n.displayName || n.name || null;
      if (typeof n == "string")
        return n;
      switch (n) {
        case f:
          return "Fragment";
        case l:
          return "Portal";
        case u:
          return "Profiler";
        case g:
          return "StrictMode";
        case o:
          return "Suspense";
        case i:
          return "SuspenseList";
      }
      if (typeof n == "object")
        switch (n.$$typeof) {
          case m:
            var p = n;
            return L(p) + ".Consumer";
          case y:
            var v = n;
            return L(v._context) + ".Provider";
          case t:
            return Y(n, n.render, "ForwardRef");
          case c:
            var E = n.displayName || null;
            return E !== null ? E : z(n.type) || "Memo";
          case d: {
            var B = n, P = B._payload, M = B._init;
            try {
              return z(M(P));
            } catch {
              return null;
            }
          }
        }
      return null;
    }
    var N = Object.assign, $ = 0, pe, le, te, ce, de, me, ye;
    function ke() {
    }
    ke.__reactDisabledLog = !0;
    function R() {
      {
        if ($ === 0) {
          pe = console.log, le = console.info, te = console.warn, ce = console.error, de = console.group, me = console.groupCollapsed, ye = console.groupEnd;
          var n = {
            configurable: !0,
            enumerable: !0,
            value: ke,
            writable: !0
          };
          Object.defineProperties(console, {
            info: n,
            log: n,
            warn: n,
            error: n,
            group: n,
            groupCollapsed: n,
            groupEnd: n
          });
        }
        $++;
      }
    }
    function U() {
      {
        if ($--, $ === 0) {
          var n = {
            configurable: !0,
            enumerable: !0,
            writable: !0
          };
          Object.defineProperties(console, {
            log: N({}, n, {
              value: pe
            }),
            info: N({}, n, {
              value: le
            }),
            warn: N({}, n, {
              value: te
            }),
            error: N({}, n, {
              value: ce
            }),
            group: N({}, n, {
              value: de
            }),
            groupCollapsed: N({}, n, {
              value: me
            }),
            groupEnd: N({}, n, {
              value: ye
            })
          });
        }
        $ < 0 && j("disabledDepth fell below zero. This is a bug in React. Please file an issue.");
      }
    }
    var ne = C.ReactCurrentDispatcher, re;
    function ie(n, p, v) {
      {
        if (re === void 0)
          try {
            throw Error();
          } catch (B) {
            var E = B.stack.trim().match(/\n( *(at )?)/);
            re = E && E[1] || "";
          }
        return `
` + re + n;
      }
    }
    var Se = !1, Ce;
    {
      var De = typeof WeakMap == "function" ? WeakMap : Map;
      Ce = new De();
    }
    function oe(n, p) {
      if (!n || Se)
        return "";
      {
        var v = Ce.get(n);
        if (v !== void 0)
          return v;
      }
      var E;
      Se = !0;
      var B = Error.prepareStackTrace;
      Error.prepareStackTrace = void 0;
      var P;
      P = ne.current, ne.current = null, R();
      try {
        if (p) {
          var M = function() {
            throw Error();
          };
          if (Object.defineProperty(M.prototype, "props", {
            set: function() {
              throw Error();
            }
          }), typeof Reflect == "object" && Reflect.construct) {
            try {
              Reflect.construct(M, []);
            } catch (ee) {
              E = ee;
            }
            Reflect.construct(n, [], M);
          } else {
            try {
              M.call();
            } catch (ee) {
              E = ee;
            }
            n.call(M.prototype);
          }
        } else {
          try {
            throw Error();
          } catch (ee) {
            E = ee;
          }
          n();
        }
      } catch (ee) {
        if (ee && E && typeof ee.stack == "string") {
          for (var T = ee.stack.split(`
`), Z = E.stack.split(`
`), W = T.length - 1, H = Z.length - 1; W >= 1 && H >= 0 && T[W] !== Z[H]; )
            H--;
          for (; W >= 1 && H >= 0; W--, H--)
            if (T[W] !== Z[H]) {
              if (W !== 1 || H !== 1)
                do
                  if (W--, H--, H < 0 || T[W] !== Z[H]) {
                    var ue = `
` + T[W].replace(" at new ", " at ");
                    return n.displayName && ue.includes("<anonymous>") && (ue = ue.replace("<anonymous>", n.displayName)), typeof n == "function" && Ce.set(n, ue), ue;
                  }
                while (W >= 1 && H >= 0);
              break;
            }
        }
      } finally {
        Se = !1, ne.current = P, U(), Error.prepareStackTrace = B;
      }
      var Be = n ? n.displayName || n.name : "", Te = Be ? ie(Be) : "";
      return typeof n == "function" && Ce.set(n, Te), Te;
    }
    function qe(n, p, v) {
      return oe(n, !1);
    }
    function Ze(n) {
      var p = n.prototype;
      return !!(p && p.isReactComponent);
    }
    function be(n, p, v) {
      if (n == null)
        return "";
      if (typeof n == "function")
        return oe(n, Ze(n));
      if (typeof n == "string")
        return ie(n);
      switch (n) {
        case o:
          return ie("Suspense");
        case i:
          return ie("SuspenseList");
      }
      if (typeof n == "object")
        switch (n.$$typeof) {
          case t:
            return qe(n.render);
          case c:
            return be(n.type, p, v);
          case d: {
            var E = n, B = E._payload, P = E._init;
            try {
              return be(P(B), p, v);
            } catch {
            }
          }
        }
      return "";
    }
    var ve = Object.prototype.hasOwnProperty, Ee = {}, Ue = C.ReactDebugCurrentFrame;
    function Ie(n) {
      if (n) {
        var p = n._owner, v = be(n.type, n._source, p ? p.type : null);
        Ue.setExtraStackFrame(v);
      } else
        Ue.setExtraStackFrame(null);
    }
    function Je(n, p, v, E, B) {
      {
        var P = Function.call.bind(ve);
        for (var M in n)
          if (P(n, M)) {
            var T = void 0;
            try {
              if (typeof n[M] != "function") {
                var Z = Error((E || "React class") + ": " + v + " type `" + M + "` is invalid; it must be a function, usually from the `prop-types` package, but received `" + typeof n[M] + "`.This often happens because of typos such as `PropTypes.function` instead of `PropTypes.func`.");
                throw Z.name = "Invariant Violation", Z;
              }
              T = n[M](p, M, E, v, null, "SECRET_DO_NOT_PASS_THIS_OR_YOU_WILL_BE_FIRED");
            } catch (W) {
              T = W;
            }
            T && !(T instanceof Error) && (Ie(B), j("%s: type specification of %s `%s` is invalid; the type checker function must return `null` or an `Error` but returned a %s. You may have forgotten to pass an argument to the type checker creator (arrayOf, instanceOf, objectOf, oneOf, oneOfType, and shape all require an argument).", E || "React class", v, M, typeof T), Ie(null)), T instanceof Error && !(T.message in Ee) && (Ee[T.message] = !0, Ie(B), j("Failed %s type: %s", v, T.message), Ie(null));
          }
      }
    }
    var O = Array.isArray;
    function Q(n) {
      return O(n);
    }
    function J(n) {
      {
        var p = typeof Symbol == "function" && Symbol.toStringTag, v = p && n[Symbol.toStringTag] || n.constructor.name || "Object";
        return v;
      }
    }
    function Re(n) {
      try {
        return je(n), !1;
      } catch {
        return !0;
      }
    }
    function je(n) {
      return "" + n;
    }
    function Ae(n) {
      if (Re(n))
        return j("The provided key is an unsupported type %s. This value must be coerced to a string before before using it here.", J(n)), je(n);
    }
    var He = C.ReactCurrentOwner, mt = {
      key: !0,
      ref: !0,
      __self: !0,
      __source: !0
    }, ge, yt;
    function Kt(n) {
      if (ve.call(n, "ref")) {
        var p = Object.getOwnPropertyDescriptor(n, "ref").get;
        if (p && p.isReactWarning)
          return !1;
      }
      return n.ref !== void 0;
    }
    function qt(n) {
      if (ve.call(n, "key")) {
        var p = Object.getOwnPropertyDescriptor(n, "key").get;
        if (p && p.isReactWarning)
          return !1;
      }
      return n.key !== void 0;
    }
    function Zt(n, p) {
      typeof n.ref == "string" && He.current;
    }
    function Jt(n, p) {
      {
        var v = function() {
          ge || (ge = !0, j("%s: `key` is not a prop. Trying to access it will result in `undefined` being returned. If you need to access the same value within the child component, you should pass it as a different prop. (https://reactjs.org/link/special-props)", p));
        };
        v.isReactWarning = !0, Object.defineProperty(n, "key", {
          get: v,
          configurable: !0
        });
      }
    }
    function en(n, p) {
      {
        var v = function() {
          yt || (yt = !0, j("%s: `ref` is not a prop. Trying to access it will result in `undefined` being returned. If you need to access the same value within the child component, you should pass it as a different prop. (https://reactjs.org/link/special-props)", p));
        };
        v.isReactWarning = !0, Object.defineProperty(n, "ref", {
          get: v,
          configurable: !0
        });
      }
    }
    var tn = function(n, p, v, E, B, P, M) {
      var T = {
        // This tag allows us to uniquely identify this as a React Element
        $$typeof: s,
        // Built-in properties that belong on the element
        type: n,
        key: p,
        ref: v,
        props: M,
        // Record the component responsible for creating this element.
        _owner: P
      };
      return T._store = {}, Object.defineProperty(T._store, "validated", {
        configurable: !1,
        enumerable: !1,
        writable: !0,
        value: !1
      }), Object.defineProperty(T, "_self", {
        configurable: !1,
        enumerable: !1,
        writable: !1,
        value: E
      }), Object.defineProperty(T, "_source", {
        configurable: !1,
        enumerable: !1,
        writable: !1,
        value: B
      }), Object.freeze && (Object.freeze(T.props), Object.freeze(T)), T;
    };
    function nn(n, p, v, E, B) {
      {
        var P, M = {}, T = null, Z = null;
        v !== void 0 && (Ae(v), T = "" + v), qt(p) && (Ae(p.key), T = "" + p.key), Kt(p) && (Z = p.ref, Zt(p, B));
        for (P in p)
          ve.call(p, P) && !mt.hasOwnProperty(P) && (M[P] = p[P]);
        if (n && n.defaultProps) {
          var W = n.defaultProps;
          for (P in W)
            M[P] === void 0 && (M[P] = W[P]);
        }
        if (T || Z) {
          var H = typeof n == "function" ? n.displayName || n.name || "Unknown" : n;
          T && Jt(M, H), Z && en(M, H);
        }
        return tn(n, T, Z, B, E, He.current, M);
      }
    }
    var et = C.ReactCurrentOwner, kt = C.ReactDebugCurrentFrame;
    function Fe(n) {
      if (n) {
        var p = n._owner, v = be(n.type, n._source, p ? p.type : null);
        kt.setExtraStackFrame(v);
      } else
        kt.setExtraStackFrame(null);
    }
    var tt;
    tt = !1;
    function nt(n) {
      return typeof n == "object" && n !== null && n.$$typeof === s;
    }
    function vt() {
      {
        if (et.current) {
          var n = z(et.current.type);
          if (n)
            return `

Check the render method of \`` + n + "`.";
        }
        return "";
      }
    }
    function rn(n) {
      return "";
    }
    var jt = {};
    function on(n) {
      {
        var p = vt();
        if (!p) {
          var v = typeof n == "string" ? n : n.displayName || n.name;
          v && (p = `

Check the top-level render call using <` + v + ">.");
        }
        return p;
      }
    }
    function bt(n, p) {
      {
        if (!n._store || n._store.validated || n.key != null)
          return;
        n._store.validated = !0;
        var v = on(p);
        if (jt[v])
          return;
        jt[v] = !0;
        var E = "";
        n && n._owner && n._owner !== et.current && (E = " It was passed a child from " + z(n._owner.type) + "."), Fe(n), j('Each child in a list should have a unique "key" prop.%s%s See https://reactjs.org/link/warning-keys for more information.', v, E), Fe(null);
      }
    }
    function wt(n, p) {
      {
        if (typeof n != "object")
          return;
        if (Q(n))
          for (var v = 0; v < n.length; v++) {
            var E = n[v];
            nt(E) && bt(E, p);
          }
        else if (nt(n))
          n._store && (n._store.validated = !0);
        else if (n) {
          var B = k(n);
          if (typeof B == "function" && B !== n.entries)
            for (var P = B.call(n), M; !(M = P.next()).done; )
              nt(M.value) && bt(M.value, p);
        }
      }
    }
    function sn(n) {
      {
        var p = n.type;
        if (p == null || typeof p == "string")
          return;
        var v;
        if (typeof p == "function")
          v = p.propTypes;
        else if (typeof p == "object" && (p.$$typeof === t || // Note: Memo only checks outer props here.
        // Inner props are checked in the reconciler.
        p.$$typeof === c))
          v = p.propTypes;
        else
          return;
        if (v) {
          var E = z(p);
          Je(v, n.props, "prop", E, n);
        } else if (p.PropTypes !== void 0 && !tt) {
          tt = !0;
          var B = z(p);
          j("Component %s declared `PropTypes` instead of `propTypes`. Did you misspell the property assignment?", B || "Unknown");
        }
        typeof p.getDefaultProps == "function" && !p.getDefaultProps.isReactClassApproved && j("getDefaultProps is only used on classic React.createClass definitions. Use a static property named `defaultProps` instead.");
      }
    }
    function an(n) {
      {
        for (var p = Object.keys(n.props), v = 0; v < p.length; v++) {
          var E = p[v];
          if (E !== "children" && E !== "key") {
            Fe(n), j("Invalid prop `%s` supplied to `React.Fragment`. React.Fragment can only have `key` and `children` props.", E), Fe(null);
            break;
          }
        }
        n.ref !== null && (Fe(n), j("Invalid attribute `ref` supplied to `React.Fragment`."), Fe(null));
      }
    }
    var St = {};
    function Ct(n, p, v, E, B, P) {
      {
        var M = fe(n);
        if (!M) {
          var T = "";
          (n === void 0 || typeof n == "object" && n !== null && Object.keys(n).length === 0) && (T += " You likely forgot to export your component from the file it's defined in, or you might have mixed up default and named imports.");
          var Z = rn();
          Z ? T += Z : T += vt();
          var W;
          n === null ? W = "null" : Q(n) ? W = "array" : n !== void 0 && n.$$typeof === s ? (W = "<" + (z(n.type) || "Unknown") + " />", T = " Did you accidentally export a JSX literal instead of a component?") : W = typeof n, j("React.jsx: type is invalid -- expected a string (for built-in components) or a class/function (for composite components) but got: %s.%s", W, T);
        }
        var H = nn(n, p, v, B, P);
        if (H == null)
          return H;
        if (M) {
          var ue = p.children;
          if (ue !== void 0)
            if (E)
              if (Q(ue)) {
                for (var Be = 0; Be < ue.length; Be++)
                  wt(ue[Be], n);
                Object.freeze && Object.freeze(ue);
              } else
                j("React.jsx: Static children should always be an array. You are likely explicitly calling React.jsxs or React.jsxDEV. Use the Babel transform instead.");
            else
              wt(ue, n);
        }
        if (ve.call(p, "key")) {
          var Te = z(n), ee = Object.keys(p).filter(function(hn) {
            return hn !== "key";
          }), rt = ee.length > 0 ? "{key: someKey, " + ee.join(": ..., ") + ": ...}" : "{key: someKey}";
          if (!St[Te + rt]) {
            var fn = ee.length > 0 ? "{" + ee.join(": ..., ") + ": ...}" : "{}";
            j(`A props object containing a "key" prop is being spread into JSX:
  let props = %s;
  <%s {...props} />
React keys must be passed directly to JSX without using spread:
  let props = %s;
  <%s key={someKey} {...props} />`, rt, Te, fn, Te), St[Te + rt] = !0;
          }
        }
        return n === f ? an(H) : sn(H), H;
      }
    }
    function ln(n, p, v) {
      return Ct(n, p, v, !0);
    }
    function cn(n, p, v) {
      return Ct(n, p, v, !1);
    }
    var dn = cn, un = ln;
    _e.Fragment = f, _e.jsx = dn, _e.jsxs = un;
  }()), _e;
}
process.env.NODE_ENV === "production" ? ut.exports = pn() : ut.exports = gn();
var e = ut.exports, xn = Object.defineProperty, Xe = Object.getOwnPropertySymbols, Bt = Object.prototype.hasOwnProperty, Nt = Object.prototype.propertyIsEnumerable, At = (a, s, l) => s in a ? xn(a, s, { enumerable: !0, configurable: !0, writable: !0, value: l }) : a[s] = l, ft = (a, s) => {
  for (var l in s || (s = {}))
    Bt.call(s, l) && At(a, l, s[l]);
  if (Xe)
    for (var l of Xe(s))
      Nt.call(s, l) && At(a, l, s[l]);
  return a;
}, ht = (a, s) => {
  var l = {};
  for (var f in a)
    Bt.call(a, f) && s.indexOf(f) < 0 && (l[f] = a[f]);
  if (a != null && Xe)
    for (var f of Xe(a))
      s.indexOf(f) < 0 && Nt.call(a, f) && (l[f] = a[f]);
  return l;
};
/**
 * @license QR Code generator library (TypeScript)
 * Copyright (c) Project Nayuki.
 * SPDX-License-Identifier: MIT
 */
var Me;
((a) => {
  const s = class A {
    /*-- Constructor (low level) and fields --*/
    // Creates a new QR Code with the given version number,
    // error correction level, data codeword bytes, and mask number.
    // This is a low-level API that most users should not use directly.
    // A mid-level API is the encodeSegments() function.
    constructor(t, o, i, c) {
      if (this.version = t, this.errorCorrectionLevel = o, this.modules = [], this.isFunction = [], t < A.MIN_VERSION || t > A.MAX_VERSION)
        throw new RangeError("Version value out of range");
      if (c < -1 || c > 7)
        throw new RangeError("Mask value out of range");
      this.size = t * 4 + 17;
      let d = [];
      for (let h = 0; h < this.size; h++)
        d.push(!1);
      for (let h = 0; h < this.size; h++)
        this.modules.push(d.slice()), this.isFunction.push(d.slice());
      this.drawFunctionPatterns();
      const x = this.addEccAndInterleave(i);
      if (this.drawCodewords(x), c == -1) {
        let h = 1e9;
        for (let b = 0; b < 8; b++) {
          this.applyMask(b), this.drawFormatBits(b);
          const k = this.getPenaltyScore();
          k < h && (c = b, h = k), this.applyMask(b);
        }
      }
      g(0 <= c && c <= 7), this.mask = c, this.applyMask(c), this.drawFormatBits(c), this.isFunction = [];
    }
    /*-- Static factory functions (high level) --*/
    // Returns a QR Code representing the given Unicode text string at the given error correction level.
    // As a conservative upper bound, this function is guaranteed to succeed for strings that have 738 or fewer
    // Unicode code points (not UTF-16 code units) if the low error correction level is used. The smallest possible
    // QR Code version is automatically chosen for the output. The ECC level of the result may be higher than the
    // ecl argument if it can be done without increasing the version.
    static encodeText(t, o) {
      const i = a.QrSegment.makeSegments(t);
      return A.encodeSegments(i, o);
    }
    // Returns a QR Code representing the given binary data at the given error correction level.
    // This function always encodes using the binary segment mode, not any text mode. The maximum number of
    // bytes allowed is 2953. The smallest possible QR Code version is automatically chosen for the output.
    // The ECC level of the result may be higher than the ecl argument if it can be done without increasing the version.
    static encodeBinary(t, o) {
      const i = a.QrSegment.makeBytes(t);
      return A.encodeSegments([i], o);
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
    static encodeSegments(t, o, i = 1, c = 40, d = -1, x = !0) {
      if (!(A.MIN_VERSION <= i && i <= c && c <= A.MAX_VERSION) || d < -1 || d > 7)
        throw new RangeError("Invalid value");
      let h, b;
      for (h = i; ; h++) {
        const w = A.getNumDataCodewords(h, o) * 8, I = y.getTotalBits(t, h);
        if (I <= w) {
          b = I;
          break;
        }
        if (h >= c)
          throw new RangeError("Data too long");
      }
      for (const w of [A.Ecc.MEDIUM, A.Ecc.QUARTILE, A.Ecc.HIGH])
        x && b <= A.getNumDataCodewords(h, w) * 8 && (o = w);
      let k = [];
      for (const w of t) {
        l(w.mode.modeBits, 4, k), l(w.numChars, w.mode.numCharCountBits(h), k);
        for (const I of w.getData())
          k.push(I);
      }
      g(k.length == b);
      const C = A.getNumDataCodewords(h, o) * 8;
      g(k.length <= C), l(0, Math.min(4, C - k.length), k), l(0, (8 - k.length % 8) % 8, k), g(k.length % 8 == 0);
      for (let w = 236; k.length < C; w ^= 253)
        l(w, 8, k);
      let j = [];
      for (; j.length * 8 < k.length; )
        j.push(0);
      return k.forEach((w, I) => j[I >>> 3] |= w << 7 - (I & 7)), new A(h, o, j, d);
    }
    /*-- Accessor methods --*/
    // Returns the color of the module (pixel) at the given coordinates, which is false
    // for light or true for dark. The top left corner has the coordinates (x=0, y=0).
    // If the given coordinates are out of bounds, then false (light) is returned.
    getModule(t, o) {
      return 0 <= t && t < this.size && 0 <= o && o < this.size && this.modules[o][t];
    }
    // Modified to expose modules for easy access
    getModules() {
      return this.modules;
    }
    /*-- Private helper methods for constructor: Drawing function modules --*/
    // Reads this object's version field, and draws and marks all function modules.
    drawFunctionPatterns() {
      for (let i = 0; i < this.size; i++)
        this.setFunctionModule(6, i, i % 2 == 0), this.setFunctionModule(i, 6, i % 2 == 0);
      this.drawFinderPattern(3, 3), this.drawFinderPattern(this.size - 4, 3), this.drawFinderPattern(3, this.size - 4);
      const t = this.getAlignmentPatternPositions(), o = t.length;
      for (let i = 0; i < o; i++)
        for (let c = 0; c < o; c++)
          i == 0 && c == 0 || i == 0 && c == o - 1 || i == o - 1 && c == 0 || this.drawAlignmentPattern(t[i], t[c]);
      this.drawFormatBits(0), this.drawVersion();
    }
    // Draws two copies of the format bits (with its own error correction code)
    // based on the given mask and this object's error correction level field.
    drawFormatBits(t) {
      const o = this.errorCorrectionLevel.formatBits << 3 | t;
      let i = o;
      for (let d = 0; d < 10; d++)
        i = i << 1 ^ (i >>> 9) * 1335;
      const c = (o << 10 | i) ^ 21522;
      g(c >>> 15 == 0);
      for (let d = 0; d <= 5; d++)
        this.setFunctionModule(8, d, f(c, d));
      this.setFunctionModule(8, 7, f(c, 6)), this.setFunctionModule(8, 8, f(c, 7)), this.setFunctionModule(7, 8, f(c, 8));
      for (let d = 9; d < 15; d++)
        this.setFunctionModule(14 - d, 8, f(c, d));
      for (let d = 0; d < 8; d++)
        this.setFunctionModule(this.size - 1 - d, 8, f(c, d));
      for (let d = 8; d < 15; d++)
        this.setFunctionModule(8, this.size - 15 + d, f(c, d));
      this.setFunctionModule(8, this.size - 8, !0);
    }
    // Draws two copies of the version bits (with its own error correction code),
    // based on this object's version field, iff 7 <= version <= 40.
    drawVersion() {
      if (this.version < 7)
        return;
      let t = this.version;
      for (let i = 0; i < 12; i++)
        t = t << 1 ^ (t >>> 11) * 7973;
      const o = this.version << 12 | t;
      g(o >>> 18 == 0);
      for (let i = 0; i < 18; i++) {
        const c = f(o, i), d = this.size - 11 + i % 3, x = Math.floor(i / 3);
        this.setFunctionModule(d, x, c), this.setFunctionModule(x, d, c);
      }
    }
    // Draws a 9*9 finder pattern including the border separator,
    // with the center module at (x, y). Modules can be out of bounds.
    drawFinderPattern(t, o) {
      for (let i = -4; i <= 4; i++)
        for (let c = -4; c <= 4; c++) {
          const d = Math.max(Math.abs(c), Math.abs(i)), x = t + c, h = o + i;
          0 <= x && x < this.size && 0 <= h && h < this.size && this.setFunctionModule(x, h, d != 2 && d != 4);
        }
    }
    // Draws a 5*5 alignment pattern, with the center module
    // at (x, y). All modules must be in bounds.
    drawAlignmentPattern(t, o) {
      for (let i = -2; i <= 2; i++)
        for (let c = -2; c <= 2; c++)
          this.setFunctionModule(t + c, o + i, Math.max(Math.abs(c), Math.abs(i)) != 1);
    }
    // Sets the color of a module and marks it as a function module.
    // Only used by the constructor. Coordinates must be in bounds.
    setFunctionModule(t, o, i) {
      this.modules[o][t] = i, this.isFunction[o][t] = !0;
    }
    /*-- Private helper methods for constructor: Codewords and masking --*/
    // Returns a new byte string representing the given data with the appropriate error correction
    // codewords appended to it, based on this object's version and error correction level.
    addEccAndInterleave(t) {
      const o = this.version, i = this.errorCorrectionLevel;
      if (t.length != A.getNumDataCodewords(o, i))
        throw new RangeError("Invalid argument");
      const c = A.NUM_ERROR_CORRECTION_BLOCKS[i.ordinal][o], d = A.ECC_CODEWORDS_PER_BLOCK[i.ordinal][o], x = Math.floor(A.getNumRawDataModules(o) / 8), h = c - x % c, b = Math.floor(x / c);
      let k = [];
      const C = A.reedSolomonComputeDivisor(d);
      for (let w = 0, I = 0; w < c; w++) {
        let G = t.slice(I, I + b - d + (w < h ? 0 : 1));
        I += G.length;
        const K = A.reedSolomonComputeRemainder(G, C);
        w < h && G.push(0), k.push(G.concat(K));
      }
      let j = [];
      for (let w = 0; w < k[0].length; w++)
        k.forEach((I, G) => {
          (w != b - d || G >= h) && j.push(I[w]);
        });
      return g(j.length == x), j;
    }
    // Draws the given sequence of 8-bit codewords (data and error correction) onto the entire
    // data area of this QR Code. Function modules need to be marked off before this is called.
    drawCodewords(t) {
      if (t.length != Math.floor(A.getNumRawDataModules(this.version) / 8))
        throw new RangeError("Invalid argument");
      let o = 0;
      for (let i = this.size - 1; i >= 1; i -= 2) {
        i == 6 && (i = 5);
        for (let c = 0; c < this.size; c++)
          for (let d = 0; d < 2; d++) {
            const x = i - d, b = (i + 1 & 2) == 0 ? this.size - 1 - c : c;
            !this.isFunction[b][x] && o < t.length * 8 && (this.modules[b][x] = f(t[o >>> 3], 7 - (o & 7)), o++);
          }
      }
      g(o == t.length * 8);
    }
    // XORs the codeword modules in this QR Code with the given mask pattern.
    // The function modules must be marked and the codeword bits must be drawn
    // before masking. Due to the arithmetic of XOR, calling applyMask() with
    // the same mask value a second time will undo the mask. A final well-formed
    // QR Code needs exactly one (not zero, two, etc.) mask applied.
    applyMask(t) {
      if (t < 0 || t > 7)
        throw new RangeError("Mask value out of range");
      for (let o = 0; o < this.size; o++)
        for (let i = 0; i < this.size; i++) {
          let c;
          switch (t) {
            case 0:
              c = (i + o) % 2 == 0;
              break;
            case 1:
              c = o % 2 == 0;
              break;
            case 2:
              c = i % 3 == 0;
              break;
            case 3:
              c = (i + o) % 3 == 0;
              break;
            case 4:
              c = (Math.floor(i / 3) + Math.floor(o / 2)) % 2 == 0;
              break;
            case 5:
              c = i * o % 2 + i * o % 3 == 0;
              break;
            case 6:
              c = (i * o % 2 + i * o % 3) % 2 == 0;
              break;
            case 7:
              c = ((i + o) % 2 + i * o % 3) % 2 == 0;
              break;
            default:
              throw new Error("Unreachable");
          }
          !this.isFunction[o][i] && c && (this.modules[o][i] = !this.modules[o][i]);
        }
    }
    // Calculates and returns the penalty score based on state of this QR Code's current modules.
    // This is used by the automatic mask choice algorithm to find the mask pattern that yields the lowest score.
    getPenaltyScore() {
      let t = 0;
      for (let d = 0; d < this.size; d++) {
        let x = !1, h = 0, b = [0, 0, 0, 0, 0, 0, 0];
        for (let k = 0; k < this.size; k++)
          this.modules[d][k] == x ? (h++, h == 5 ? t += A.PENALTY_N1 : h > 5 && t++) : (this.finderPenaltyAddHistory(h, b), x || (t += this.finderPenaltyCountPatterns(b) * A.PENALTY_N3), x = this.modules[d][k], h = 1);
        t += this.finderPenaltyTerminateAndCount(x, h, b) * A.PENALTY_N3;
      }
      for (let d = 0; d < this.size; d++) {
        let x = !1, h = 0, b = [0, 0, 0, 0, 0, 0, 0];
        for (let k = 0; k < this.size; k++)
          this.modules[k][d] == x ? (h++, h == 5 ? t += A.PENALTY_N1 : h > 5 && t++) : (this.finderPenaltyAddHistory(h, b), x || (t += this.finderPenaltyCountPatterns(b) * A.PENALTY_N3), x = this.modules[k][d], h = 1);
        t += this.finderPenaltyTerminateAndCount(x, h, b) * A.PENALTY_N3;
      }
      for (let d = 0; d < this.size - 1; d++)
        for (let x = 0; x < this.size - 1; x++) {
          const h = this.modules[d][x];
          h == this.modules[d][x + 1] && h == this.modules[d + 1][x] && h == this.modules[d + 1][x + 1] && (t += A.PENALTY_N2);
        }
      let o = 0;
      for (const d of this.modules)
        o = d.reduce((x, h) => x + (h ? 1 : 0), o);
      const i = this.size * this.size, c = Math.ceil(Math.abs(o * 20 - i * 10) / i) - 1;
      return g(0 <= c && c <= 9), t += c * A.PENALTY_N4, g(0 <= t && t <= 2568888), t;
    }
    /*-- Private helper functions --*/
    // Returns an ascending list of positions of alignment patterns for this version number.
    // Each position is in the range [0,177), and are used on both the x and y axes.
    // This could be implemented as lookup table of 40 variable-length lists of integers.
    getAlignmentPatternPositions() {
      if (this.version == 1)
        return [];
      {
        const t = Math.floor(this.version / 7) + 2, o = this.version == 32 ? 26 : Math.ceil((this.version * 4 + 4) / (t * 2 - 2)) * 2;
        let i = [6];
        for (let c = this.size - 7; i.length < t; c -= o)
          i.splice(1, 0, c);
        return i;
      }
    }
    // Returns the number of data bits that can be stored in a QR Code of the given version number, after
    // all function modules are excluded. This includes remainder bits, so it might not be a multiple of 8.
    // The result is in the range [208, 29648]. This could be implemented as a 40-entry lookup table.
    static getNumRawDataModules(t) {
      if (t < A.MIN_VERSION || t > A.MAX_VERSION)
        throw new RangeError("Version number out of range");
      let o = (16 * t + 128) * t + 64;
      if (t >= 2) {
        const i = Math.floor(t / 7) + 2;
        o -= (25 * i - 10) * i - 55, t >= 7 && (o -= 36);
      }
      return g(208 <= o && o <= 29648), o;
    }
    // Returns the number of 8-bit data (i.e. not error correction) codewords contained in any
    // QR Code of the given version number and error correction level, with remainder bits discarded.
    // This stateless pure function could be implemented as a (40*4)-cell lookup table.
    static getNumDataCodewords(t, o) {
      return Math.floor(A.getNumRawDataModules(t) / 8) - A.ECC_CODEWORDS_PER_BLOCK[o.ordinal][t] * A.NUM_ERROR_CORRECTION_BLOCKS[o.ordinal][t];
    }
    // Returns a Reed-Solomon ECC generator polynomial for the given degree. This could be
    // implemented as a lookup table over all possible parameter values, instead of as an algorithm.
    static reedSolomonComputeDivisor(t) {
      if (t < 1 || t > 255)
        throw new RangeError("Degree out of range");
      let o = [];
      for (let c = 0; c < t - 1; c++)
        o.push(0);
      o.push(1);
      let i = 1;
      for (let c = 0; c < t; c++) {
        for (let d = 0; d < o.length; d++)
          o[d] = A.reedSolomonMultiply(o[d], i), d + 1 < o.length && (o[d] ^= o[d + 1]);
        i = A.reedSolomonMultiply(i, 2);
      }
      return o;
    }
    // Returns the Reed-Solomon error correction codeword for the given data and divisor polynomials.
    static reedSolomonComputeRemainder(t, o) {
      let i = o.map((c) => 0);
      for (const c of t) {
        const d = c ^ i.shift();
        i.push(0), o.forEach((x, h) => i[h] ^= A.reedSolomonMultiply(x, d));
      }
      return i;
    }
    // Returns the product of the two given field elements modulo GF(2^8/0x11D). The arguments and result
    // are unsigned 8-bit integers. This could be implemented as a lookup table of 256*256 entries of uint8.
    static reedSolomonMultiply(t, o) {
      if (t >>> 8 || o >>> 8)
        throw new RangeError("Byte out of range");
      let i = 0;
      for (let c = 7; c >= 0; c--)
        i = i << 1 ^ (i >>> 7) * 285, i ^= (o >>> c & 1) * t;
      return g(i >>> 8 == 0), i;
    }
    // Can only be called immediately after a light run is added, and
    // returns either 0, 1, or 2. A helper function for getPenaltyScore().
    finderPenaltyCountPatterns(t) {
      const o = t[1];
      g(o <= this.size * 3);
      const i = o > 0 && t[2] == o && t[3] == o * 3 && t[4] == o && t[5] == o;
      return (i && t[0] >= o * 4 && t[6] >= o ? 1 : 0) + (i && t[6] >= o * 4 && t[0] >= o ? 1 : 0);
    }
    // Must be called at the end of a line (row or column) of modules. A helper function for getPenaltyScore().
    finderPenaltyTerminateAndCount(t, o, i) {
      return t && (this.finderPenaltyAddHistory(o, i), o = 0), o += this.size, this.finderPenaltyAddHistory(o, i), this.finderPenaltyCountPatterns(i);
    }
    // Pushes the given value to the front and drops the last value. A helper function for getPenaltyScore().
    finderPenaltyAddHistory(t, o) {
      o[0] == 0 && (t += this.size), o.pop(), o.unshift(t);
    }
  };
  s.MIN_VERSION = 1, s.MAX_VERSION = 40, s.PENALTY_N1 = 3, s.PENALTY_N2 = 3, s.PENALTY_N3 = 40, s.PENALTY_N4 = 10, s.ECC_CODEWORDS_PER_BLOCK = [
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
  ], s.NUM_ERROR_CORRECTION_BLOCKS = [
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
  ], a.QrCode = s;
  function l(m, t, o) {
    if (t < 0 || t > 31 || m >>> t)
      throw new RangeError("Value out of range");
    for (let i = t - 1; i >= 0; i--)
      o.push(m >>> i & 1);
  }
  function f(m, t) {
    return (m >>> t & 1) != 0;
  }
  function g(m) {
    if (!m)
      throw new Error("Assertion error");
  }
  const u = class D {
    /*-- Constructor (low level) and fields --*/
    // Creates a new QR Code segment with the given attributes and data.
    // The character count (numChars) must agree with the mode and the bit buffer length,
    // but the constraint isn't checked. The given bit buffer is cloned and stored.
    constructor(t, o, i) {
      if (this.mode = t, this.numChars = o, this.bitData = i, o < 0)
        throw new RangeError("Invalid argument");
      this.bitData = i.slice();
    }
    /*-- Static factory functions (mid level) --*/
    // Returns a segment representing the given binary data encoded in
    // byte mode. All input byte arrays are acceptable. Any text string
    // can be converted to UTF-8 bytes and encoded as a byte mode segment.
    static makeBytes(t) {
      let o = [];
      for (const i of t)
        l(i, 8, o);
      return new D(D.Mode.BYTE, t.length, o);
    }
    // Returns a segment representing the given string of decimal digits encoded in numeric mode.
    static makeNumeric(t) {
      if (!D.isNumeric(t))
        throw new RangeError("String contains non-numeric characters");
      let o = [];
      for (let i = 0; i < t.length; ) {
        const c = Math.min(t.length - i, 3);
        l(parseInt(t.substring(i, i + c), 10), c * 3 + 1, o), i += c;
      }
      return new D(D.Mode.NUMERIC, t.length, o);
    }
    // Returns a segment representing the given text string encoded in alphanumeric mode.
    // The characters allowed are: 0 to 9, A to Z (uppercase only), space,
    // dollar, percent, asterisk, plus, hyphen, period, slash, colon.
    static makeAlphanumeric(t) {
      if (!D.isAlphanumeric(t))
        throw new RangeError("String contains unencodable characters in alphanumeric mode");
      let o = [], i;
      for (i = 0; i + 2 <= t.length; i += 2) {
        let c = D.ALPHANUMERIC_CHARSET.indexOf(t.charAt(i)) * 45;
        c += D.ALPHANUMERIC_CHARSET.indexOf(t.charAt(i + 1)), l(c, 11, o);
      }
      return i < t.length && l(D.ALPHANUMERIC_CHARSET.indexOf(t.charAt(i)), 6, o), new D(D.Mode.ALPHANUMERIC, t.length, o);
    }
    // Returns a new mutable list of zero or more segments to represent the given Unicode text string.
    // The result may use various segment modes and switch modes to optimize the length of the bit stream.
    static makeSegments(t) {
      return t == "" ? [] : D.isNumeric(t) ? [D.makeNumeric(t)] : D.isAlphanumeric(t) ? [D.makeAlphanumeric(t)] : [D.makeBytes(D.toUtf8ByteArray(t))];
    }
    // Returns a segment representing an Extended Channel Interpretation
    // (ECI) designator with the given assignment value.
    static makeEci(t) {
      let o = [];
      if (t < 0)
        throw new RangeError("ECI assignment value out of range");
      if (t < 128)
        l(t, 8, o);
      else if (t < 16384)
        l(2, 2, o), l(t, 14, o);
      else if (t < 1e6)
        l(6, 3, o), l(t, 21, o);
      else
        throw new RangeError("ECI assignment value out of range");
      return new D(D.Mode.ECI, 0, o);
    }
    // Tests whether the given string can be encoded as a segment in numeric mode.
    // A string is encodable iff each character is in the range 0 to 9.
    static isNumeric(t) {
      return D.NUMERIC_REGEX.test(t);
    }
    // Tests whether the given string can be encoded as a segment in alphanumeric mode.
    // A string is encodable iff each character is in the following set: 0 to 9, A to Z
    // (uppercase only), space, dollar, percent, asterisk, plus, hyphen, period, slash, colon.
    static isAlphanumeric(t) {
      return D.ALPHANUMERIC_REGEX.test(t);
    }
    /*-- Methods --*/
    // Returns a new copy of the data bits of this segment.
    getData() {
      return this.bitData.slice();
    }
    // (Package-private) Calculates and returns the number of bits needed to encode the given segments at
    // the given version. The result is infinity if a segment has too many characters to fit its length field.
    static getTotalBits(t, o) {
      let i = 0;
      for (const c of t) {
        const d = c.mode.numCharCountBits(o);
        if (c.numChars >= 1 << d)
          return 1 / 0;
        i += 4 + d + c.bitData.length;
      }
      return i;
    }
    // Returns a new array of bytes representing the given string encoded in UTF-8.
    static toUtf8ByteArray(t) {
      t = encodeURI(t);
      let o = [];
      for (let i = 0; i < t.length; i++)
        t.charAt(i) != "%" ? o.push(t.charCodeAt(i)) : (o.push(parseInt(t.substring(i + 1, i + 3), 16)), i += 2);
      return o;
    }
  };
  u.NUMERIC_REGEX = /^[0-9]*$/, u.ALPHANUMERIC_REGEX = /^[A-Z0-9 $%*+.\/:-]*$/, u.ALPHANUMERIC_CHARSET = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ $%*+-./:";
  let y = u;
  a.QrSegment = u;
})(Me || (Me = {}));
((a) => {
  ((s) => {
    const l = class {
      // The QR Code can tolerate about 30% erroneous codewords
      /*-- Constructor and fields --*/
      constructor(g, u) {
        this.ordinal = g, this.formatBits = u;
      }
    };
    l.LOW = new l(0, 1), l.MEDIUM = new l(1, 0), l.QUARTILE = new l(2, 3), l.HIGH = new l(3, 2), s.Ecc = l;
  })(a.QrCode || (a.QrCode = {}));
})(Me || (Me = {}));
((a) => {
  ((s) => {
    const l = class {
      /*-- Constructor and fields --*/
      constructor(g, u) {
        this.modeBits = g, this.numBitsCharCount = u;
      }
      /*-- Method --*/
      // (Package-private) Returns the bit width of the character count field for a segment in
      // this mode in a QR Code at the given version number. The result is in the range [0, 16].
      numCharCountBits(g) {
        return this.numBitsCharCount[Math.floor((g + 7) / 17)];
      }
    };
    l.NUMERIC = new l(1, [10, 12, 14]), l.ALPHANUMERIC = new l(2, [9, 11, 13]), l.BYTE = new l(4, [8, 16, 16]), l.KANJI = new l(8, [8, 10, 12]), l.ECI = new l(7, [0, 0, 0]), s.Mode = l;
  })(a.QrSegment || (a.QrSegment = {}));
})(Me || (Me = {}));
var Oe = Me;
/**
 * @license qrcode.react
 * Copyright (c) Paul O'Shannessy
 * SPDX-License-Identifier: ISC
 */
var mn = {
  L: Oe.QrCode.Ecc.LOW,
  M: Oe.QrCode.Ecc.MEDIUM,
  Q: Oe.QrCode.Ecc.QUARTILE,
  H: Oe.QrCode.Ecc.HIGH
}, Ot = 128, Pt = "L", zt = "#FFFFFF", Dt = "#000000", Wt = !1, _t = 1, yn = 4, kn = 0, vn = 0.1;
function $t(a, s = 0) {
  const l = [];
  return a.forEach(function(f, g) {
    let u = null;
    f.forEach(function(y, m) {
      if (!y && u !== null) {
        l.push(
          `M${u + s} ${g + s}h${m - u}v1H${u + s}z`
        ), u = null;
        return;
      }
      if (m === f.length - 1) {
        if (!y)
          return;
        u === null ? l.push(`M${m + s},${g + s} h1v1H${m + s}z`) : l.push(
          `M${u + s},${g + s} h${m + 1 - u}v1H${u + s}z`
        );
        return;
      }
      y && u === null && (u = m);
    });
  }), l.join("");
}
function Ut(a, s) {
  return a.slice().map((l, f) => f < s.y || f >= s.y + s.h ? l : l.map((g, u) => u < s.x || u >= s.x + s.w ? g : !1));
}
function jn(a, s, l, f) {
  if (f == null)
    return null;
  const g = a.length + l * 2, u = Math.floor(s * vn), y = g / s, m = (f.width || u) * y, t = (f.height || u) * y, o = f.x == null ? a.length / 2 - m / 2 : f.x * y, i = f.y == null ? a.length / 2 - t / 2 : f.y * y, c = f.opacity == null ? 1 : f.opacity;
  let d = null;
  if (f.excavate) {
    let h = Math.floor(o), b = Math.floor(i), k = Math.ceil(m + o - h), C = Math.ceil(t + i - b);
    d = { x: h, y: b, w: k, h: C };
  }
  const x = f.crossOrigin;
  return { x: o, y: i, h: t, w: m, excavation: d, opacity: c, crossOrigin: x };
}
function bn(a, s) {
  return s != null ? Math.max(Math.floor(s), 0) : a ? yn : kn;
}
function Ht({
  value: a,
  level: s,
  minVersion: l,
  includeMargin: f,
  marginSize: g,
  imageSettings: u,
  size: y,
  boostLevel: m
}) {
  let t = _.useMemo(() => {
    const h = (Array.isArray(a) ? a : [a]).reduce((b, k) => (b.push(...Oe.QrSegment.makeSegments(k)), b), []);
    return Oe.QrCode.encodeSegments(
      h,
      mn[s],
      l,
      void 0,
      void 0,
      m
    );
  }, [a, s, l, m]);
  const { cells: o, margin: i, numCells: c, calculatedImageSettings: d } = _.useMemo(() => {
    let x = t.getModules();
    const h = bn(f, g), b = x.length + h * 2, k = jn(
      x,
      y,
      h,
      u
    );
    return {
      cells: x,
      margin: h,
      numCells: b,
      calculatedImageSettings: k
    };
  }, [t, y, u, f, g]);
  return {
    qrcode: t,
    margin: i,
    cells: o,
    numCells: c,
    calculatedImageSettings: d
  };
}
var wn = function() {
  try {
    new Path2D().addPath(new Path2D());
  } catch {
    return !1;
  }
  return !0;
}(), Sn = _.forwardRef(
  function(s, l) {
    const f = s, {
      value: g,
      size: u = Ot,
      level: y = Pt,
      bgColor: m = zt,
      fgColor: t = Dt,
      includeMargin: o = Wt,
      minVersion: i = _t,
      boostLevel: c,
      marginSize: d,
      imageSettings: x
    } = f, b = ht(f, [
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
    ]), { style: k } = b, C = ht(b, ["style"]), j = x == null ? void 0 : x.src, w = _.useRef(null), I = _.useRef(null), G = _.useCallback(
      (N) => {
        w.current = N, typeof l == "function" ? l(N) : l && (l.current = N);
      },
      [l]
    ), [K, he] = _.useState(!1), { margin: q, cells: ae, numCells: fe, calculatedImageSettings: Y } = Ht({
      value: g,
      level: y,
      minVersion: i,
      boostLevel: c,
      includeMargin: o,
      marginSize: d,
      imageSettings: x,
      size: u
    });
    _.useEffect(() => {
      if (w.current != null) {
        const N = w.current, $ = N.getContext("2d");
        if (!$)
          return;
        let pe = ae;
        const le = I.current, te = Y != null && le !== null && le.complete && le.naturalHeight !== 0 && le.naturalWidth !== 0;
        te && Y.excavation != null && (pe = Ut(
          ae,
          Y.excavation
        ));
        const ce = window.devicePixelRatio || 1;
        N.height = N.width = u * ce;
        const de = u / fe * ce;
        $.scale(de, de), $.fillStyle = m, $.fillRect(0, 0, fe, fe), $.fillStyle = t, wn ? $.fill(new Path2D($t(pe, q))) : ae.forEach(function(me, ye) {
          me.forEach(function(ke, R) {
            ke && $.fillRect(R + q, ye + q, 1, 1);
          });
        }), Y && ($.globalAlpha = Y.opacity), te && $.drawImage(
          le,
          Y.x + q,
          Y.y + q,
          Y.w,
          Y.h
        );
      }
    }), _.useEffect(() => {
      he(!1);
    }, [j]);
    const L = ft({ height: u, width: u }, k);
    let z = null;
    return j != null && (z = /* @__PURE__ */ _.createElement(
      "img",
      {
        src: j,
        key: j,
        style: { display: "none" },
        onLoad: () => {
          he(!0);
        },
        ref: I,
        crossOrigin: Y == null ? void 0 : Y.crossOrigin
      }
    )), /* @__PURE__ */ _.createElement(_.Fragment, null, /* @__PURE__ */ _.createElement(
      "canvas",
      ft({
        style: L,
        height: u,
        width: u,
        ref: G,
        role: "img"
      }, C)
    ), z);
  }
);
Sn.displayName = "QRCodeCanvas";
var Vt = _.forwardRef(
  function(s, l) {
    const f = s, {
      value: g,
      size: u = Ot,
      level: y = Pt,
      bgColor: m = zt,
      fgColor: t = Dt,
      includeMargin: o = Wt,
      minVersion: i = _t,
      boostLevel: c,
      title: d,
      marginSize: x,
      imageSettings: h
    } = f, b = ht(f, [
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
    ]), { margin: k, cells: C, numCells: j, calculatedImageSettings: w } = Ht({
      value: g,
      level: y,
      minVersion: i,
      boostLevel: c,
      includeMargin: o,
      marginSize: x,
      imageSettings: h,
      size: u
    });
    let I = C, G = null;
    h != null && w != null && (w.excavation != null && (I = Ut(
      C,
      w.excavation
    )), G = /* @__PURE__ */ _.createElement(
      "image",
      {
        href: h.src,
        height: w.h,
        width: w.w,
        x: w.x + k,
        y: w.y + k,
        preserveAspectRatio: "none",
        opacity: w.opacity,
        crossOrigin: w.crossOrigin
      }
    ));
    const K = $t(I, k);
    return /* @__PURE__ */ _.createElement(
      "svg",
      ft({
        height: u,
        width: u,
        viewBox: `0 0 ${j} ${j}`,
        ref: l,
        role: "img"
      }, b),
      !!d && /* @__PURE__ */ _.createElement("title", null, d),
      /* @__PURE__ */ _.createElement(
        "path",
        {
          fill: m,
          d: `M0,0 h${j}v${j}H0z`,
          shapeRendering: "crispEdges"
        }
      ),
      /* @__PURE__ */ _.createElement("path", { fill: t, d: K, shapeRendering: "crispEdges" }),
      G
    );
  }
);
Vt.displayName = "QRCodeSVG";
const it = {}, Cn = typeof window < "u" && window.__WEAVE_API_BASE__ || (it == null ? void 0 : it.VITE_API_BASE) || "http://localhost:4000/api/v1";
async function pt(a, s, l) {
  const f = {
    "Content-Type": "application/json",
    ...s ? { "x-api-key": s } : {},
    ...l == null ? void 0 : l.headers
  }, g = await fetch(`${Cn}${a}`, { ...l, headers: f });
  if (g.status === 204) return null;
  const u = await g.json();
  if (!u.success) throw new Error(u.error ?? "API error");
  return u.data;
}
const Ve = (a) => `fiat:${a.toUpperCase()}`, ot = (a, s) => `crypto:${a.toUpperCase()}:${s.toUpperCase()}`;
async function st(a, s) {
  const l = new URLSearchParams({
    from: s.from,
    to: s.to,
    amount: String(s.amount),
    ...s.amountIn ? { amountIn: s.amountIn } : {}
  });
  return pt(`/quotes?${l}`, a);
}
async function at(a, s) {
  return pt("/orders", a, {
    method: "POST",
    body: JSON.stringify(s)
  });
}
async function Ke(a, s) {
  return pt(`/orders/${s}`, a);
}
const Ne = {}, En = Vt, r = {
  ink: "#0B0F0E",
  ink2: "#3A4240",
  mute: "#6B7572",
  hair: "#E8EAE6",
  surface: "#FFFFFF",
  panel: "#FAFAF7",
  accent: "#0F5D4C",
  accentSoft: "#E6F0EC",
  good: "#1F7A4D",
  goodSoft: "#E6F3EC",
  warn: "#A46A00",
  warnSoft: "#FBF0DC",
  err: "#A8321E"
}, se = {
  NGN: { name: "Nigerian Naira", symbol: "₦", flag: "🇳🇬", rate: 1515, min: 5e3, country: "Nigeria", psp: "GTBank", bank: "GTBank ••7890", method: "Bank transfer" }
}, Ge = [
  { token: "ETH", chain: "Optimism", amount: 0.312, usd: 1024.4, icon: "Ξ", chainTint: "#ff3f57" },
  { token: "USDC", chain: "Base", amount: 150, usd: 150, icon: "$", chainTint: "#1C4FE0" },
  { token: "STRK", chain: "Starknet", amount: 840, usd: 184.8, icon: "S", chainTint: "#EC796B" },
  { token: "DAI", chain: "Ethereum", amount: 502, usd: 502, icon: "D", chainTint: "#F5AC37" }
], xe = (a, s, l) => {
  const f = se[s], g = l ?? (Number.isInteger(a) ? 0 : 2), u = new Intl.NumberFormat("en-US", {
    minimumFractionDigits: g,
    maximumFractionDigits: g
  }).format(a);
  return `${f.symbol}${u}`;
}, $e = (a, s = 4) => a.toLocaleString("en-US", { maximumFractionDigits: s });
function S({ gap: a = 12, children: s, style: l }) {
  return /* @__PURE__ */ e.jsx("div", { style: { display: "flex", flexDirection: "column", gap: a, ...l }, children: s });
}
function V({
  gap: a = 10,
  align: s = "center",
  justify: l = "flex-start",
  children: f,
  style: g
}) {
  return /* @__PURE__ */ e.jsx("div", { style: { display: "flex", alignItems: s, justifyContent: l, gap: a, ...g }, children: f });
}
function Pe() {
  return /* @__PURE__ */ e.jsx("div", { style: { height: 1, background: r.hair, width: "100%" } });
}
function gt({ children: a, tone: s = "neutral" }) {
  const l = {
    neutral: { bg: "#F1F0EB", fg: r.ink2 },
    good: { bg: r.goodSoft, fg: r.good },
    accent: { bg: r.accentSoft, fg: r.accent },
    warn: { bg: r.warnSoft, fg: r.warn }
  }[s];
  return /* @__PURE__ */ e.jsx("span", { style: {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    height: 22,
    padding: "0 9px",
    borderRadius: 999,
    background: l.bg,
    color: l.fg,
    fontSize: 11.5,
    fontWeight: 500,
    letterSpacing: 0.1
  }, children: a });
}
function we({ bg: a, children: s, size: l = 32 }) {
  return /* @__PURE__ */ e.jsx("div", { style: {
    width: l,
    height: l,
    borderRadius: l / 2,
    background: a,
    color: "#fff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 700,
    fontSize: l * 0.42,
    flexShrink: 0,
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace"
  }, children: s });
}
function xt({ size: a = 22 }) {
  return /* @__PURE__ */ e.jsxs("svg", { width: a, height: a, viewBox: "0 0 24 24", fill: "none", "aria-hidden": !0, children: [
    /* @__PURE__ */ e.jsx("path", { d: "M3 5 L8 19 L12 9 L16 19 L21 5", stroke: r.accent, strokeWidth: "2.2", strokeLinecap: "round", strokeLinejoin: "round" }),
    /* @__PURE__ */ e.jsx("path", { d: "M5 9 L12 19 L19 9", stroke: r.ink, strokeWidth: "1.2", strokeLinecap: "round", strokeLinejoin: "round", opacity: "0.3" })
  ] });
}
const Gt = {
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
}, Rn = { ...Gt, color: r.ink };
function An({
  merchantName: a,
  onClose: s,
  showBack: l,
  onBack: f
}) {
  return /* @__PURE__ */ e.jsxs("div", { style: {
    padding: "16px 20px 14px",
    display: "flex",
    alignItems: "center",
    gap: 10,
    borderBottom: `1px solid ${r.hair}`
  }, children: [
    l ? /* @__PURE__ */ e.jsx("button", { onClick: f, style: Rn, children: /* @__PURE__ */ e.jsx("svg", { width: "14", height: "14", viewBox: "0 0 24 24", fill: "none", children: /* @__PURE__ */ e.jsx("path", { d: "M15 18L9 12L15 6", stroke: "currentColor", strokeWidth: "2.2", strokeLinecap: "round", strokeLinejoin: "round" }) }) }) : /* @__PURE__ */ e.jsxs("div", { style: { display: "flex", alignItems: "center", gap: 8 }, children: [
      /* @__PURE__ */ e.jsx(xt, { size: 22 }),
      /* @__PURE__ */ e.jsx("span", { style: { fontWeight: 600, fontSize: 15, letterSpacing: -0.2 }, children: "Weave" })
    ] }),
    /* @__PURE__ */ e.jsxs("div", { style: { flex: 1, textAlign: "center", fontSize: 12.5, color: r.mute }, children: [
      "Paying ",
      /* @__PURE__ */ e.jsx("span", { style: { color: r.ink, fontWeight: 500 }, children: a })
    ] }),
    /* @__PURE__ */ e.jsx("button", { onClick: s, style: Gt, children: /* @__PURE__ */ e.jsx("svg", { width: "14", height: "14", viewBox: "0 0 24 24", fill: "none", children: /* @__PURE__ */ e.jsx("path", { d: "M6 6L18 18M6 18L18 6", stroke: "currentColor", strokeWidth: "2.2", strokeLinecap: "round" }) }) })
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
      "Secured by Weave"
    ] }),
    /* @__PURE__ */ e.jsx("div", { style: { display: "flex", alignItems: "center", gap: 10 }, children: /* @__PURE__ */ e.jsx("span", { children: "ChainRails · Paycrest" }) })
  ] });
}
const Tt = {
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
}, lt = {
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
}, ze = {
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
}, Yt = {
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
function Ln({ onPick: a, merchant: s }) {
  const l = se[s.currency], [f, g] = F(!1);
  return /* @__PURE__ */ e.jsxs(S, { gap: 16, style: { padding: "22px 20px 6px" }, children: [
    /* @__PURE__ */ e.jsxs(S, { gap: 10, style: { alignItems: "center", padding: "4px 0 6px" }, children: [
      /* @__PURE__ */ e.jsx("div", { style: {
        width: 44,
        height: 44,
        borderRadius: 10,
        background: "#2B1810",
        color: "#F5DEB3",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontWeight: 700,
        fontSize: 20,
        fontFamily: "Georgia, serif",
        boxShadow: "0 2px 6px rgba(0,0,0,0.08)"
      }, children: "A" }),
      /* @__PURE__ */ e.jsxs(S, { gap: 3, style: { alignItems: "center" }, children: [
        /* @__PURE__ */ e.jsxs("div", { style: { fontSize: 12.5, color: r.mute }, children: [
          "Pay ",
          s.name
        ] }),
        /* @__PURE__ */ e.jsx("div", { style: { fontSize: 30, fontWeight: 600, letterSpacing: -0.6, color: r.ink }, children: xe(s.amount, s.currency) }),
        /* @__PURE__ */ e.jsx("div", { style: { fontSize: 11.5, color: r.mute }, children: "Order #AFR-0481 · 2 items" })
      ] })
    ] }),
    /* @__PURE__ */ e.jsxs(S, { gap: 8, children: [
      /* @__PURE__ */ e.jsx("div", { style: { fontSize: 11, color: r.mute, textTransform: "uppercase", letterSpacing: 0.6 }, children: "How would you like to pay?" }),
      /* @__PURE__ */ e.jsxs("button", { onClick: () => a("fiat"), style: Tt, children: [
        /* @__PURE__ */ e.jsx("div", { style: { width: 40, height: 40, borderRadius: 10, background: "#fff", border: `1px solid ${r.hair}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }, children: /* @__PURE__ */ e.jsx("svg", { width: "20", height: "20", viewBox: "0 0 24 24", fill: "none", children: /* @__PURE__ */ e.jsx("path", { d: "M3 21H21M5 21V10M9 21V10M15 21V10M19 21V10M2 10L12 3L22 10H2Z", stroke: r.ink, strokeWidth: "1.7", strokeLinecap: "round", strokeLinejoin: "round" }) }) }),
        /* @__PURE__ */ e.jsxs(S, { gap: 2, style: { flex: 1, textAlign: "left", minWidth: 0 }, children: [
          /* @__PURE__ */ e.jsx("div", { style: { fontSize: 14, fontWeight: 500, color: r.ink }, children: "Bank transfer" }),
          /* @__PURE__ */ e.jsxs("div", { style: { fontSize: 11.5, color: r.mute }, children: [
            "Pay in ",
            l.name,
            " · Instant · No fees"
          ] })
        ] }),
        /* @__PURE__ */ e.jsx("svg", { width: "14", height: "14", viewBox: "0 0 24 24", fill: "none", style: { marginLeft: 4, flexShrink: 0 }, children: /* @__PURE__ */ e.jsx("path", { d: "M9 6L15 12L9 18", stroke: r.mute, strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round" }) })
      ] }),
      /* @__PURE__ */ e.jsxs("button", { onClick: () => a("crypto"), style: Tt, children: [
        /* @__PURE__ */ e.jsx("div", { style: { width: 40, height: 40, borderRadius: 10, background: "#fff", border: `1px solid ${r.hair}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }, children: /* @__PURE__ */ e.jsx(we, { bg: "#F6851B", size: 24, children: "🦊" }) }),
        /* @__PURE__ */ e.jsxs(S, { gap: 2, style: { flex: 1, textAlign: "left", minWidth: 0 }, children: [
          /* @__PURE__ */ e.jsx("div", { style: { fontSize: 14, fontWeight: 500 }, children: "Pay with crypto wallet" }),
          /* @__PURE__ */ e.jsx("div", { style: { fontSize: 11.5, color: r.mute }, children: "MetaMask detected · Any chain, any token" })
        ] }),
        /* @__PURE__ */ e.jsx("svg", { width: "14", height: "14", viewBox: "0 0 24 24", fill: "none", style: { marginLeft: 4, flexShrink: 0 }, children: /* @__PURE__ */ e.jsx("path", { d: "M9 6L15 12L9 18", stroke: r.mute, strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round" }) })
      ] }),
      f ? /* @__PURE__ */ e.jsxs(S, { gap: 6, style: { padding: "2px 0" }, children: [
        /* @__PURE__ */ e.jsxs(V, { gap: 6, children: [
          /* @__PURE__ */ e.jsxs("button", { onClick: () => a("crypto"), style: { ...lt, flex: 1 }, children: [
            /* @__PURE__ */ e.jsx(we, { bg: "#3B99FC", size: 20, children: "W" }),
            /* @__PURE__ */ e.jsx("span", { style: { fontSize: 12.5, fontWeight: 500 }, children: "WalletConnect" })
          ] }),
          /* @__PURE__ */ e.jsxs("button", { onClick: () => a("crypto"), style: { ...lt, flex: 1 }, children: [
            /* @__PURE__ */ e.jsx(we, { bg: "#0052FF", size: 20, children: "B" }),
            /* @__PURE__ */ e.jsx("span", { style: { fontSize: 12.5, fontWeight: 500 }, children: "Coinbase" })
          ] })
        ] }),
        /* @__PURE__ */ e.jsxs("button", { onClick: () => a("deposit"), style: lt, children: [
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
    ] }),
    /* @__PURE__ */ e.jsxs(V, { gap: 6, justify: "center", style: { padding: "4px 0 0", fontSize: 11.5, color: r.mute }, children: [
      /* @__PURE__ */ e.jsxs("svg", { width: "11", height: "11", viewBox: "0 0 24 24", fill: "none", children: [
        /* @__PURE__ */ e.jsx("path", { d: "M12 2L3 6V12C3 17 6.5 21 12 22C17.5 21 21 17 21 12V6L12 2Z", stroke: "currentColor", strokeWidth: "1.8" }),
        /* @__PURE__ */ e.jsx("path", { d: "M9 12L11 14L15 10", stroke: "currentColor", strokeWidth: "1.8", strokeLinecap: "round", strokeLinejoin: "round" })
      ] }),
      "Bank-grade encryption · Weave never holds your money"
    ] })
  ] });
}
function Mn({
  onNext: a,
  merchant: s,
  balances: l,
  selected: f,
  setSelected: g
}) {
  return /* @__PURE__ */ e.jsxs(S, { gap: 14, style: { padding: "18px 20px 6px" }, children: [
    /* @__PURE__ */ e.jsxs(S, { gap: 4, children: [
      /* @__PURE__ */ e.jsx("div", { style: { fontSize: 18, fontWeight: 600, letterSpacing: -0.3 }, children: "Choose what you'd like to pay with" }),
      /* @__PURE__ */ e.jsxs("div", { style: { fontSize: 12.5, color: r.mute }, children: [
        "We found these balances in your wallet. Pick any — we'll convert to ",
        se[s.currency].name,
        " for ",
        s.name,
        "."
      ] })
    ] }),
    /* @__PURE__ */ e.jsx(S, { gap: 6, children: l.map((u, y) => {
      const m = u.usd >= s.amount / se[s.currency].rate, t = f === y;
      return /* @__PURE__ */ e.jsxs(
        "button",
        {
          onClick: () => m && g(y),
          disabled: !m,
          style: {
            width: "100%",
            padding: "12px 14px",
            background: t ? r.accentSoft : "#fff",
            border: `1.5px solid ${t ? r.accent : r.hair}`,
            borderRadius: 12,
            cursor: m ? "pointer" : "not-allowed",
            opacity: m ? 1 : 0.48,
            display: "flex",
            alignItems: "center",
            gap: 12,
            textAlign: "left",
            fontFamily: "inherit",
            transition: "all 0.15s"
          },
          children: [
            /* @__PURE__ */ e.jsx(we, { bg: u.chainTint, size: 36, children: u.icon }),
            /* @__PURE__ */ e.jsxs(S, { gap: 2, style: { flex: 1 }, children: [
              /* @__PURE__ */ e.jsxs("div", { style: { fontSize: 14, fontWeight: 500, color: r.ink }, children: [
                $e(u.amount),
                " ",
                u.token
              ] }),
              /* @__PURE__ */ e.jsxs("div", { style: { fontSize: 12, color: r.mute }, children: [
                "on ",
                u.chain,
                " · ≈ $",
                u.usd.toFixed(2)
              ] })
            ] }),
            !m && /* @__PURE__ */ e.jsx(gt, { tone: "warn", children: "Too low" }),
            m && t && /* @__PURE__ */ e.jsx("div", { style: { width: 20, height: 20, borderRadius: 10, background: r.accent, display: "flex", alignItems: "center", justifyContent: "center" }, children: /* @__PURE__ */ e.jsx("svg", { width: "12", height: "12", viewBox: "0 0 24 24", fill: "none", children: /* @__PURE__ */ e.jsx("path", { d: "M5 12L10 17L19 7", stroke: "white", strokeWidth: "3", strokeLinecap: "round", strokeLinejoin: "round" }) }) })
          ]
        },
        y
      );
    }) }),
    /* @__PURE__ */ e.jsx("button", { onClick: () => a("quote"), style: { ...ze, opacity: f === null ? 0.5 : 1 }, disabled: f === null, children: "Continue" })
  ] });
}
function In({
  merchant: a,
  balance: s,
  onConfirm: l,
  submitting: f,
  error: g,
  quote: u,
  quoteLoading: y
}) {
  const m = a.amount / se[a.currency].rate, t = u ? u.breakdown.inputAmount : m, o = t / (s.usd / s.amount), i = u ? u.breakdown.bridgeFeeUsd : s.chain === "Base" && s.token === "USDC" ? 0 : 1.8, c = u ? u.breakdown.senderFeeUsd + u.breakdown.appFeeUsd : t * 75e-4, d = i + c, x = u ? u.breakdown.sellRate : se[a.currency].rate, h = u ? u.estimatedFiat : a.amount;
  return /* @__PURE__ */ e.jsxs(S, { gap: 14, style: { padding: "16px 20px 6px" }, children: [
    /* @__PURE__ */ e.jsxs(S, { gap: 6, children: [
      /* @__PURE__ */ e.jsx("div", { style: { fontSize: 11, color: r.mute, textTransform: "uppercase", letterSpacing: 0.6 }, children: "You pay" }),
      /* @__PURE__ */ e.jsxs(V, { align: "baseline", gap: 8, children: [
        /* @__PURE__ */ e.jsx("div", { style: { fontSize: 30, fontWeight: 600, letterSpacing: -0.6 }, children: $e(o, 4) }),
        /* @__PURE__ */ e.jsx("div", { style: { fontSize: 16, color: r.ink2, fontWeight: 500 }, children: s.token })
      ] }),
      /* @__PURE__ */ e.jsxs(V, { gap: 6, style: { fontSize: 12, color: r.mute }, children: [
        /* @__PURE__ */ e.jsx(we, { bg: s.chainTint, size: 14, children: s.icon }),
        "on ",
        s.chain
      ] })
    ] }),
    /* @__PURE__ */ e.jsxs("div", { style: { padding: "2px 0", position: "relative" }, children: [
      /* @__PURE__ */ e.jsx(Pe, {}),
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
    /* @__PURE__ */ e.jsxs(S, { gap: 6, children: [
      /* @__PURE__ */ e.jsxs("div", { style: { fontSize: 11, color: r.mute, textTransform: "uppercase", letterSpacing: 0.6 }, children: [
        a.name,
        " receives"
      ] }),
      /* @__PURE__ */ e.jsx(V, { align: "baseline", gap: 8, children: /* @__PURE__ */ e.jsx("div", { style: { fontSize: 30, fontWeight: 600, letterSpacing: -0.6, color: r.accent }, children: xe(h, a.currency) }) }),
      /* @__PURE__ */ e.jsxs(V, { gap: 6, style: { fontSize: 12, color: r.mute }, children: [
        "via ",
        se[a.currency].method,
        " · ",
        se[a.currency].psp
      ] })
    ] }),
    /* @__PURE__ */ e.jsxs(S, { gap: 7, style: { fontSize: 12.5 }, children: [
      /* @__PURE__ */ e.jsxs(V, { justify: "space-between", children: [
        /* @__PURE__ */ e.jsx("span", { style: { color: r.mute }, children: "Rate" }),
        /* @__PURE__ */ e.jsxs("span", { children: [
          "1 USDC = ",
          xe(x, a.currency)
        ] })
      ] }),
      i > 0 && /* @__PURE__ */ e.jsxs(V, { justify: "space-between", children: [
        /* @__PURE__ */ e.jsx("span", { style: { color: r.mute }, children: "Network & bridge" }),
        /* @__PURE__ */ e.jsxs("span", { children: [
          "$",
          i.toFixed(2)
        ] })
      ] }),
      /* @__PURE__ */ e.jsxs(V, { justify: "space-between", children: [
        /* @__PURE__ */ e.jsx("span", { style: { color: r.mute }, children: "Weave fee" }),
        /* @__PURE__ */ e.jsxs("span", { children: [
          "$",
          c.toFixed(2)
        ] })
      ] }),
      /* @__PURE__ */ e.jsx(Pe, {}),
      /* @__PURE__ */ e.jsxs(V, { justify: "space-between", style: { fontWeight: 500, color: r.ink }, children: [
        /* @__PURE__ */ e.jsx("span", { children: "Total fees" }),
        /* @__PURE__ */ e.jsxs("span", { children: [
          "$",
          d.toFixed(2)
        ] })
      ] }),
      y && /* @__PURE__ */ e.jsx("div", { style: { fontSize: 11, color: r.mute, textAlign: "center" }, children: "Fetching live rate…" })
    ] }),
    /* @__PURE__ */ e.jsxs(S, { gap: 8, children: [
      g && /* @__PURE__ */ e.jsx("div", { style: {
        background: "#FBEEE9",
        border: `1px solid ${r.err}33`,
        borderRadius: 10,
        padding: "10px 12px",
        fontSize: 12,
        color: r.err,
        lineHeight: 1.5
      }, children: g }),
      /* @__PURE__ */ e.jsxs("button", { onClick: l, disabled: f, style: { ...ze, opacity: f ? 0.6 : 1, cursor: f ? "not-allowed" : "pointer" }, children: [
        f ? "Creating order…" : "Confirm in wallet",
        !f && /* @__PURE__ */ e.jsx("svg", { width: "14", height: "14", viewBox: "0 0 24 24", fill: "none", children: /* @__PURE__ */ e.jsx("path", { d: "M5 12H19M13 6L19 12L13 18", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round" }) })
      ] }),
      /* @__PURE__ */ e.jsx("div", { style: { fontSize: 11, color: r.mute, textAlign: "center" }, children: "Rate locked for 30s · You'll sign one transaction in your wallet" })
    ] })
  ] });
}
function Fn() {
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
    /* @__PURE__ */ e.jsx("div", { style: { position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }, children: /* @__PURE__ */ e.jsx(xt, { size: 22 }) })
  ] });
}
const Bn = /* @__PURE__ */ new Set(["settled", "completed"]), Nn = /* @__PURE__ */ new Set(["failed", "expired", "refunded"]);
function Lt({
  onNext: a,
  merchant: s,
  mode: l,
  apiKey: f,
  orderId: g,
  bankDetails: u
}) {
  const [y, m] = F(0), t = Qe(!1), o = se[s.currency], i = u != null && u.amountToTransfer ? (() => {
    const x = u.amountToTransfer, h = x.includes(".") ? x.split(".")[1].length : 0;
    return xe(Number(x), s.currency, h);
  })() : xe(s.amount, s.currency), c = l === "fiat" ? [
    { label: "Confirming your transfer", sub: `Matching the ${i} from your bank`, dur: 1600 },
    { label: "Completing payment", sub: `Sending to ${s.name}`, dur: 2400 }
  ] : [
    { label: "Waiting for deposit", sub: "Detecting your transaction on-chain", dur: 1400 },
    { label: "Confirming your payment", sub: `Settling ${o.name} to ${s.name}`, dur: 2600 }
  ];
  Le(() => {
    if (g) return;
    if (y >= c.length) {
      a("success");
      return;
    }
    const x = setTimeout(() => m((h) => h + 1), c[y].dur);
    return () => clearTimeout(x);
  }, [y, g]), Le(() => {
    if (!g) return;
    t.current = !1;
    let x;
    const h = async () => {
      if (!t.current) {
        try {
          const b = await Ke(f, g), k = String(b.status ?? "").toLowerCase(), C = String(b.paycrestStatus ?? "").toLowerCase();
          if (Bn.has(k)) {
            t.current = !0, a("success");
            return;
          }
          if (Nn.has(k)) {
            t.current = !0, a("error");
            return;
          }
          C === "fulfilled" && m(1);
        } catch {
        }
        x = setTimeout(h, 5e3);
      }
    };
    return h(), () => {
      t.current = !0, clearTimeout(x);
    };
  }, [g, f]);
  const d = c[Math.min(y, c.length - 1)];
  return /* @__PURE__ */ e.jsxs(S, { gap: 20, style: { padding: "28px 20px 12px", minHeight: 360 }, children: [
    /* @__PURE__ */ e.jsxs(S, { gap: 12, style: { alignItems: "center", paddingTop: 12 }, children: [
      /* @__PURE__ */ e.jsx(Fn, {}),
      /* @__PURE__ */ e.jsxs(S, { gap: 4, style: { alignItems: "center" }, children: [
        /* @__PURE__ */ e.jsx("div", { style: { fontSize: 17, fontWeight: 600, letterSpacing: -0.3 }, children: d.label }),
        /* @__PURE__ */ e.jsx("div", { style: { fontSize: 12.5, color: r.mute, textAlign: "center" }, children: d.sub })
      ] })
    ] }),
    /* @__PURE__ */ e.jsx(S, { gap: 0, style: { padding: "4px 8px" }, children: c.map((x, h) => /* @__PURE__ */ e.jsxs(V, { gap: 12, style: { padding: "10px 0" }, children: [
      /* @__PURE__ */ e.jsxs("div", { style: {
        width: 22,
        height: 22,
        borderRadius: 11,
        flexShrink: 0,
        background: h < y ? r.accent : "#fff",
        border: h < y ? "none" : `1.5px solid ${h === y ? r.accent : r.hair}`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        position: "relative"
      }, children: [
        h < y && /* @__PURE__ */ e.jsx("svg", { width: "12", height: "12", viewBox: "0 0 24 24", fill: "none", children: /* @__PURE__ */ e.jsx("path", { d: "M5 12L10 17L19 7", stroke: "white", strokeWidth: "3", strokeLinecap: "round", strokeLinejoin: "round" }) }),
        h === y && /* @__PURE__ */ e.jsx("div", { style: { width: 8, height: 8, borderRadius: 4, background: r.accent, animation: "wpulse 1.1s ease-in-out infinite" } })
      ] }),
      /* @__PURE__ */ e.jsxs(S, { gap: 1, children: [
        /* @__PURE__ */ e.jsx("div", { style: { fontSize: 13, fontWeight: 500, color: h <= y ? r.ink : r.mute }, children: x.label }),
        /* @__PURE__ */ e.jsx("div", { style: { fontSize: 11.5, color: r.mute }, children: h < y ? "Completed" : h === y ? x.sub : "Pending" })
      ] })
    ] }, h)) }),
    /* @__PURE__ */ e.jsx("div", { style: { fontSize: 11, color: r.mute, textAlign: "center" }, children: "You can safely close this window. We'll email a receipt." })
  ] });
}
function Mt({
  onNext: a,
  merchant: s,
  balance: l,
  direction: f,
  apiKey: g,
  orderId: u
}) {
  var h;
  const [y, m] = F(null);
  Le(() => {
    if (!u) return;
    let b = !1;
    return Ke(g, u).then((k) => {
      b || m(k);
    }).catch(() => {
    }), () => {
      b = !0;
    };
  }, [g, u]);
  const t = typeof (y == null ? void 0 : y.sourceAssetKey) == "string" ? y.sourceAssetKey.split(":").pop() : void 0, o = f === "offramp" && y ? `${$e(Number(y.sourceAmount), 4)} ${t ?? l.token}` : `${$e(l.amount * 0.3, 4)} ${l.token}`, i = (h = y == null ? void 0 : y.destInstrument) == null ? void 0 : h.bankInstitution, c = f === "offramp" ? i ? Xt(s.currency, i) : se[s.currency].bank : s.name, d = y != null && y.createdAt && (y != null && y.updatedAt) ? Math.max(1, Math.round((new Date(y.updatedAt).getTime() - new Date(y.createdAt).getTime()) / 1e3)) : null, x = d == null ? "—" : d < 60 ? `${d}s` : `${Math.round(d / 60)}m`;
  return /* @__PURE__ */ e.jsxs(S, { gap: 18, style: { padding: "28px 20px 12px", minHeight: 360 }, children: [
    /* @__PURE__ */ e.jsxs(S, { gap: 14, style: { alignItems: "center", paddingTop: 8 }, children: [
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
      /* @__PURE__ */ e.jsxs(S, { gap: 4, style: { alignItems: "center" }, children: [
        /* @__PURE__ */ e.jsx("div", { style: { fontSize: 20, fontWeight: 600, letterSpacing: -0.3 }, children: "Payment complete" }),
        /* @__PURE__ */ e.jsx("div", { style: { fontSize: 13, color: r.mute, textAlign: "center", lineHeight: 1.5, maxWidth: 280 }, children: f === "offramp" ? /* @__PURE__ */ e.jsxs(e.Fragment, { children: [
          xe(s.amount, s.currency),
          " is on its way to ",
          /* @__PURE__ */ e.jsx("span", { style: { color: r.ink }, children: s.name }),
          "."
        ] }) : /* @__PURE__ */ e.jsxs(e.Fragment, { children: [
          "Your payment of ",
          xe(s.amount, s.currency),
          " has been sent to ",
          /* @__PURE__ */ e.jsx("span", { style: { color: r.ink }, children: s.name }),
          "."
        ] }) })
      ] })
    ] }),
    /* @__PURE__ */ e.jsxs(S, { gap: 0, style: { background: r.panel, border: `1px solid ${r.hair}`, borderRadius: 12, overflow: "hidden" }, children: [
      /* @__PURE__ */ e.jsxs(V, { justify: "space-between", style: { padding: "12px 14px", fontSize: 12.5 }, children: [
        /* @__PURE__ */ e.jsx("span", { style: { color: r.mute }, children: "Paid with" }),
        f === "offramp" ? /* @__PURE__ */ e.jsxs(V, { gap: 6, children: [
          /* @__PURE__ */ e.jsx(we, { bg: l.chainTint, size: 16, children: l.icon }),
          /* @__PURE__ */ e.jsx("span", { style: { fontWeight: 500 }, children: o })
        ] }) : /* @__PURE__ */ e.jsxs(V, { gap: 6, children: [
          /* @__PURE__ */ e.jsx("div", { style: { width: 16, height: 16, borderRadius: 8, background: "#fff", border: `1px solid ${r.hair}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10 }, children: se[s.currency].flag }),
          /* @__PURE__ */ e.jsx("span", { style: { fontWeight: 500 }, children: xe(s.amount, s.currency) })
        ] })
      ] }),
      /* @__PURE__ */ e.jsx(Pe, {}),
      /* @__PURE__ */ e.jsxs(V, { justify: "space-between", style: { padding: "12px 14px", fontSize: 12.5 }, children: [
        /* @__PURE__ */ e.jsx("span", { style: { color: r.mute }, children: f === "offramp" ? "Settled to" : "Paid to" }),
        /* @__PURE__ */ e.jsx("span", { style: { fontWeight: 500 }, children: c })
      ] }),
      /* @__PURE__ */ e.jsx(Pe, {}),
      /* @__PURE__ */ e.jsxs(V, { justify: "space-between", style: { padding: "12px 14px", fontSize: 12.5 }, children: [
        /* @__PURE__ */ e.jsx("span", { style: { color: r.mute }, children: "Completed in" }),
        /* @__PURE__ */ e.jsx(V, { gap: 6, children: /* @__PURE__ */ e.jsx(gt, { tone: "good", children: x }) })
      ] })
    ] }),
    /* @__PURE__ */ e.jsxs(S, { gap: 8, children: [
      /* @__PURE__ */ e.jsx("button", { onClick: () => a("connect"), style: ze, children: "Done" }),
      /* @__PURE__ */ e.jsxs("button", { style: { ...Yt, justifyContent: "center", paddingLeft: 0 }, children: [
        /* @__PURE__ */ e.jsx("svg", { width: "14", height: "14", viewBox: "0 0 24 24", fill: "none", children: /* @__PURE__ */ e.jsx("path", { d: "M12 3V15M12 15L7 10M12 15L17 10M3 19H21", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round" }) }),
        "Download receipt"
      ] })
    ] })
  ] });
}
function It({ onNext: a, onBack: s }) {
  return /* @__PURE__ */ e.jsxs(S, { gap: 16, style: { padding: "28px 20px 12px", minHeight: 360 }, children: [
    /* @__PURE__ */ e.jsxs(S, { gap: 14, style: { alignItems: "center", paddingTop: 8 }, children: [
      /* @__PURE__ */ e.jsx("div", { style: { width: 64, height: 64, borderRadius: 32, background: "#FBEEE9", display: "flex", alignItems: "center", justifyContent: "center" }, children: /* @__PURE__ */ e.jsxs("svg", { width: "32", height: "32", viewBox: "0 0 24 24", fill: "none", children: [
        /* @__PURE__ */ e.jsx("path", { d: "M12 8V13M12 17V17.01", stroke: r.err, strokeWidth: "2.4", strokeLinecap: "round" }),
        /* @__PURE__ */ e.jsx("circle", { cx: "12", cy: "12", r: "10", stroke: r.err, strokeWidth: "2" })
      ] }) }),
      /* @__PURE__ */ e.jsxs(S, { gap: 4, style: { alignItems: "center" }, children: [
        /* @__PURE__ */ e.jsx("div", { style: { fontSize: 18, fontWeight: 600 }, children: "Transaction didn't go through" }),
        /* @__PURE__ */ e.jsx("div", { style: { fontSize: 13, color: r.mute, textAlign: "center", maxWidth: 280 }, children: "Your wallet rejected the signature or the rate expired. No funds were moved." })
      ] })
    ] }),
    /* @__PURE__ */ e.jsxs(S, { gap: 8, children: [
      /* @__PURE__ */ e.jsx("button", { onClick: () => s("quote"), style: ze, children: "Try again" }),
      /* @__PURE__ */ e.jsx("button", { onClick: () => a("connect"), style: Yt, children: "Use a different payment method" })
    ] })
  ] });
}
const ct = [
  // Base (our primary rail — USDC first)
  { id: "BASE", name: "Base", token: "USDC", tint: "#1C4FE0", icon: "$", network: "Base" },
  { id: "BASE", name: "Base", token: "ETH", tint: "#1C4FE0", icon: "Ξ", network: "Base" },
  // Ethereum
  { id: "ETHEREUM", name: "Ethereum", token: "ETH", tint: "#627EEA", icon: "Ξ", network: "Ethereum" },
  { id: "ETHEREUM", name: "Ethereum", token: "USDC", tint: "#627EEA", icon: "$", network: "Ethereum" },
  { id: "ETHEREUM", name: "Ethereum", token: "USDT", tint: "#627EEA", icon: "T", network: "Ethereum" },
  // Arbitrum / Optimism
  { id: "ARBITRUM", name: "Arbitrum", token: "ETH", tint: "#28A0F0", icon: "Ξ", network: "Arbitrum One" },
  { id: "ARBITRUM", name: "Arbitrum", token: "USDC", tint: "#28A0F0", icon: "$", network: "Arbitrum One" },
  { id: "OPTIMISM", name: "Optimism", token: "ETH", tint: "#FF0420", icon: "Ξ", network: "Optimism" },
  { id: "OPTIMISM", name: "Optimism", token: "USDC", tint: "#FF0420", icon: "$", network: "Optimism" },
  // Polygon / BSC / Avalanche
  { id: "POLYGON", name: "Polygon", token: "POL", tint: "#7B3FE4", icon: "P", network: "Polygon" },
  { id: "POLYGON", name: "Polygon", token: "USDC", tint: "#7B3FE4", icon: "$", network: "Polygon" },
  { id: "BSC", name: "BNB Chain", token: "BNB", tint: "#F0B90B", icon: "B", network: "BNB Smart Chain" },
  { id: "BSC", name: "BNB Chain", token: "USDT", tint: "#F0B90B", icon: "T", network: "BNB Smart Chain" },
  { id: "AVALANCHE", name: "Avalanche", token: "AVAX", tint: "#E84142", icon: "A", network: "Avalanche C-Chain" },
  { id: "AVALANCHE", name: "Avalanche", token: "USDC", tint: "#E84142", icon: "$", network: "Avalanche C-Chain" },
  // Other EVM L2s
  { id: "GNOSIS", name: "Gnosis", token: "USDC", tint: "#04795B", icon: "$", network: "Gnosis Chain" },
  { id: "SCROLL", name: "Scroll", token: "USDC", tint: "#D9A26C", icon: "$", network: "Scroll" },
  { id: "XLAYER", name: "X Layer", token: "USDT", tint: "#1E1E1E", icon: "T", network: "X Layer" },
  { id: "BERA", name: "Berachain", token: "BERA", tint: "#814625", icon: "B", network: "Berachain" },
  // Non-EVM
  { id: "SOLANA", name: "Solana", token: "SOL", tint: "#14F195", icon: "S", network: "Solana" },
  { id: "SOLANA", name: "Solana", token: "USDC", tint: "#14F195", icon: "$", network: "Solana" },
  { id: "TRON", name: "Tron", token: "TRX", tint: "#EF0027", icon: "T", network: "Tron" },
  { id: "TRON", name: "Tron", token: "USDT", tint: "#EF0027", icon: "T", network: "Tron" },
  { id: "NEAR", name: "NEAR", token: "NEAR", tint: "#111111", icon: "N", network: "NEAR" },
  { id: "NEAR", name: "NEAR", token: "USDC", tint: "#111111", icon: "$", network: "NEAR" },
  { id: "TON", name: "TON", token: "TON", tint: "#0098EA", icon: "T", network: "TON" },
  { id: "TON", name: "TON", token: "USDT", tint: "#0098EA", icon: "T", network: "TON" },
  { id: "SUI", name: "Sui", token: "SUI", tint: "#4DA2FF", icon: "S", network: "Sui" },
  { id: "APTOS", name: "Aptos", token: "APT", tint: "#111111", icon: "A", network: "Aptos" },
  { id: "STARKNET", name: "Starknet", token: "STRK", tint: "#EC796B", icon: "S", network: "Starknet" },
  // Native-coin L1s
  { id: "BITCOIN", name: "Bitcoin", token: "BTC", tint: "#F7931A", icon: "₿", network: "Bitcoin" },
  { id: "XRP", name: "XRP Ledger", token: "XRP", tint: "#23292F", icon: "X", network: "XRP Ledger" },
  { id: "STELLAR", name: "Stellar", token: "XLM", tint: "#111111", icon: "★", network: "Stellar" },
  { id: "CARDANO", name: "Cardano", token: "ADA", tint: "#0033AD", icon: "₳", network: "Cardano" },
  { id: "DOGE", name: "Dogecoin", token: "DOGE", tint: "#C2A633", icon: "D", network: "Dogecoin" },
  { id: "LITECOIN", name: "Litecoin", token: "LTC", tint: "#345D9D", icon: "L", network: "Litecoin" },
  { id: "BCH", name: "Bitcoin Cash", token: "BCH", tint: "#8DC351", icon: "B", network: "Bitcoin Cash" },
  { id: "ZEC", name: "Zcash", token: "ZEC", tint: "#F4B728", icon: "Z", network: "Zcash" },
  { id: "DASH", name: "Dash", token: "DASH", tint: "#008CE7", icon: "D", network: "Dash" }
], On = /* @__PURE__ */ new Set(["XRP", "TON", "STELLAR", "NEAR"]), Pn = {
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
}, zn = {
  "BASE:USDC": { chainId: 8453, contract: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", decimals: 6 },
  "OPTIMISM:USDC": { chainId: 10, contract: "0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85", decimals: 6 },
  "ARBITRUM:USDC": { chainId: 42161, contract: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831", decimals: 6 },
  "POLYGON:USDC": { chainId: 137, contract: "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359", decimals: 6 }
}, Dn = (a, s, l, f) => {
  if (!a) return "";
  if (!s || !l || !f) return a;
  const g = zn[`${l.toUpperCase()}:${f.toUpperCase()}`];
  if (!g) return a;
  const u = BigInt(Math.round(s * 10 ** g.decimals));
  return `ethereum:${g.contract}@${g.chainId}/transfer?address=${a}&uint256=${u.toString()}`;
};
function Wn({
  onNext: a,
  merchant: s,
  depositAddress: l,
  depositMemo: f,
  amountToSend: g,
  sourceToken: u,
  sourceChain: y,
  loading: m,
  error: t,
  onChainChange: o,
  ready: i,
  apiKey: c,
  orderId: d
}) {
  const [x, h] = F(null), [b, k] = F(!1), [C, j] = F(""), [w, I] = F(""), [G, K] = F(!1), [he, q] = F(!1), [ae, fe] = F(!1), Y = C.trim() ? ct.map((R, U) => ({ c: R, i: U })).filter(({ c: R }) => {
    const U = C.trim().toLowerCase();
    return R.name.toLowerCase().includes(U) || R.token.toLowerCase().includes(U) || R.network.toLowerCase().includes(U) || R.id.toLowerCase().includes(U);
  }) : ct.map((R, U) => ({ c: R, i: U })), L = x != null ? ct[x] : null, z = l ?? "", N = f ?? "", $ = u ?? (L == null ? void 0 : L.token) ?? "", pe = s.amount / se[s.currency].rate, le = g ?? pe, te = Dn(z, g, y, u), ce = Qe(null), de = L ? On.has(L.id) : !1, me = () => {
    if (!L || !w.trim()) return;
    const R = `${L.id}:${L.token}:${w.trim()}`;
    ce.current !== R && (ce.current = R, K(!0), o(L.id, L.token, w.trim()));
  };
  Le(() => {
    K(!1), I(""), ce.current = null;
  }, [x]), Le(() => {
    if (!d) return;
    let R = !1, U;
    const ne = async () => {
      if (!R) {
        try {
          const re = await Ke(c, d), ie = String(re.status ?? "").toLowerCase(), Se = String(re.nearStatus ?? "").toLowerCase(), De = Array.isArray(re.steps) && re.steps.some((oe) => (oe == null ? void 0 : oe.provider) === "nearintents") && Se === "processing";
          if (ie && ie !== "awaiting_deposit" || De) {
            R = !0, ie === "completed" ? a("success") : ["failed", "refunded"].includes(ie) ? a("error") : a("processing");
            return;
          }
        } catch {
        }
        U = setTimeout(ne, 5e3);
      }
    };
    return ne(), () => {
      R = !0, clearTimeout(U);
    };
  }, [c, d, a]);
  const ye = () => {
    var R;
    z && ((R = navigator.clipboard) == null || R.writeText(z), q(!0), setTimeout(() => q(!1), 1500));
  }, ke = () => {
    var R;
    N && ((R = navigator.clipboard) == null || R.writeText(N), fe(!0), setTimeout(() => fe(!1), 1500));
  };
  return b ? /* @__PURE__ */ e.jsxs(S, { gap: 12, style: { padding: "16px 20px 6px" }, children: [
    /* @__PURE__ */ e.jsxs(S, { gap: 8, children: [
      /* @__PURE__ */ e.jsxs(
        "button",
        {
          onClick: () => {
            k(!1), j("");
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
          value: C,
          onChange: (R) => j(R.target.value),
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
    }, children: Y.length === 0 ? /* @__PURE__ */ e.jsxs("div", { style: { padding: "24px 10px", fontSize: 12, color: r.mute, textAlign: "center" }, children: [
      'No matches for "',
      C.trim(),
      '"'
    ] }) : Y.map(({ c: R, i: U }) => /* @__PURE__ */ e.jsxs("button", { onClick: () => {
      h(U), k(!1), j("");
    }, style: {
      width: "100%",
      padding: "10px 10px",
      borderRadius: 7,
      background: U === x ? r.accentSoft : "transparent",
      border: "none",
      cursor: "pointer",
      fontFamily: "inherit",
      display: "flex",
      alignItems: "center",
      gap: 10,
      textAlign: "left"
    }, children: [
      /* @__PURE__ */ e.jsx(we, { bg: R.tint, size: 24, children: R.icon }),
      /* @__PURE__ */ e.jsxs("div", { style: { flex: 1 }, children: [
        /* @__PURE__ */ e.jsxs("div", { style: { fontSize: 13, fontWeight: 500 }, children: [
          R.token,
          " on ",
          R.name
        ] }),
        /* @__PURE__ */ e.jsx("div", { style: { fontSize: 10.5, color: r.mute }, children: R.network })
      ] }),
      U === x && /* @__PURE__ */ e.jsx("svg", { width: "14", height: "14", viewBox: "0 0 24 24", fill: "none", children: /* @__PURE__ */ e.jsx("path", { d: "M5 12L10 17L19 7", stroke: r.accent, strokeWidth: "2.8", strokeLinecap: "round", strokeLinejoin: "round" }) })
    ] }, `${R.id}:${R.token}`)) })
  ] }) : /* @__PURE__ */ e.jsxs(S, { gap: 14, style: { padding: "16px 20px 6px" }, children: [
    /* @__PURE__ */ e.jsxs(S, { gap: 4, children: [
      /* @__PURE__ */ e.jsx("div", { style: { fontSize: 18, fontWeight: 600, letterSpacing: -0.3 }, children: "Send from any wallet" }),
      /* @__PURE__ */ e.jsx("div", { style: { fontSize: 12.5, color: r.mute, lineHeight: 1.5 }, children: "Scan the QR or copy the address. Send from a mobile wallet, exchange, or hardware device — we'll detect the deposit automatically." })
    ] }),
    /* @__PURE__ */ e.jsxs(S, { gap: 6, children: [
      /* @__PURE__ */ e.jsx("div", { style: { fontSize: 11, color: r.mute, textTransform: "uppercase", letterSpacing: 0.6 }, children: "Network" }),
      /* @__PURE__ */ e.jsx("button", { onClick: () => k(!0), style: {
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
      }, children: L ? /* @__PURE__ */ e.jsxs(e.Fragment, { children: [
        /* @__PURE__ */ e.jsx(we, { bg: L.tint, size: 26, children: L.icon }),
        /* @__PURE__ */ e.jsxs(S, { gap: 1, style: { flex: 1 }, children: [
          /* @__PURE__ */ e.jsxs("div", { style: { fontSize: 13.5, fontWeight: 500 }, children: [
            L.token,
            " on ",
            L.name
          ] }),
          /* @__PURE__ */ e.jsx("div", { style: { fontSize: 11, color: r.mute }, children: L.network })
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
        /* @__PURE__ */ e.jsxs(S, { gap: 1, style: { flex: 1 }, children: [
          /* @__PURE__ */ e.jsx("div", { style: { fontSize: 13.5, fontWeight: 500, color: r.ink }, children: "Choose a network" }),
          /* @__PURE__ */ e.jsx("div", { style: { fontSize: 11, color: r.mute }, children: "30+ chains supported · powered by NEAR Intents" })
        ] }),
        /* @__PURE__ */ e.jsx("svg", { width: "14", height: "14", viewBox: "0 0 24 24", fill: "none", children: /* @__PURE__ */ e.jsx("path", { d: "M6 9L12 15L18 9", stroke: r.mute, strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round" }) })
      ] }) })
    ] }),
    L ? G ? /* @__PURE__ */ e.jsxs(e.Fragment, { children: [
      /* @__PURE__ */ e.jsxs("div", { style: {
        background: r.panel,
        border: `1px solid ${r.hair}`,
        borderRadius: 12,
        padding: "16px",
        display: "flex",
        gap: 14,
        alignItems: "center"
      }, children: [
        /* @__PURE__ */ e.jsx("div", { style: { padding: 8, background: "#fff", borderRadius: 10, border: `1px solid ${r.hair}`, flexShrink: 0 }, children: te ? /* @__PURE__ */ e.jsx(En, { value: te, size: 120, level: "M", includeMargin: !1 }) : /* @__PURE__ */ e.jsxs("div", { style: {
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
        /* @__PURE__ */ e.jsxs(S, { gap: 8, style: { flex: 1, minWidth: 0 }, children: [
          /* @__PURE__ */ e.jsxs(S, { gap: 2, children: [
            /* @__PURE__ */ e.jsx("div", { style: { fontSize: 10.5, color: r.mute, textTransform: "uppercase", letterSpacing: 0.6 }, children: "Amount" }),
            /* @__PURE__ */ e.jsxs("div", { style: { fontSize: 18, fontWeight: 600, letterSpacing: -0.3 }, children: [
              $e(le, 8),
              " ",
              $
            ] }),
            /* @__PURE__ */ e.jsxs("div", { style: { fontSize: 11, color: r.mute }, children: [
              "on ",
              L.name
            ] })
          ] }),
          /* @__PURE__ */ e.jsxs("div", { style: { fontSize: 10.5, color: r.mute, lineHeight: 1.4 }, children: [
            "Rate locked for ",
            /* @__PURE__ */ e.jsx("span", { style: { color: r.ink, fontWeight: 500 }, children: "9:42" })
          ] })
        ] })
      ] }),
      /* @__PURE__ */ e.jsxs(S, { gap: 6, children: [
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
          }, children: m ? "Generating address…" : z || "—" }),
          /* @__PURE__ */ e.jsx("button", { onClick: ye, disabled: !z, style: {
            height: 40,
            padding: "0 14px",
            border: "none",
            borderLeft: `1px solid ${r.hair}`,
            background: he ? r.accentSoft : "#fff",
            color: he ? r.accent : z ? r.ink : r.mute,
            fontSize: 12,
            fontWeight: 500,
            cursor: z ? "pointer" : "not-allowed",
            fontFamily: "inherit",
            display: "flex",
            alignItems: "center",
            gap: 6
          }, children: he ? /* @__PURE__ */ e.jsxs(e.Fragment, { children: [
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
        t && /* @__PURE__ */ e.jsxs(S, { gap: 6, children: [
          /* @__PURE__ */ e.jsx("div", { style: { fontSize: 11.5, color: r.err }, children: t }),
          /* @__PURE__ */ e.jsx(
            "button",
            {
              onClick: () => {
                K(!1), ce.current = null;
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
      (N || de) && /* @__PURE__ */ e.jsxs(S, { gap: 6, children: [
        /* @__PURE__ */ e.jsxs("div", { style: { fontSize: 11, color: r.mute, textTransform: "uppercase", letterSpacing: 0.6, display: "flex", alignItems: "center", gap: 6 }, children: [
          L.id === "XRP" ? "Destination tag" : "Memo",
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
          }, children: m ? "Generating memo…" : N || "—" }),
          /* @__PURE__ */ e.jsx("button", { onClick: ke, disabled: !N, style: {
            height: 40,
            padding: "0 14px",
            border: "none",
            borderLeft: `1px solid ${r.hair}`,
            background: ae ? r.accentSoft : "#fff",
            color: ae ? r.accent : N ? r.ink : r.mute,
            fontSize: 12,
            fontWeight: 500,
            cursor: N ? "pointer" : "not-allowed",
            fontFamily: "inherit",
            display: "flex",
            alignItems: "center",
            gap: 6
          }, children: ae ? /* @__PURE__ */ e.jsxs(e.Fragment, { children: [
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
          L.id === "XRP" ? "destination tag" : "memo",
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
          /* @__PURE__ */ e.jsx("b", { children: L.token }),
          " on the ",
          /* @__PURE__ */ e.jsx("b", { children: L.name }),
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
          L.name,
          "…"
        ] }),
        /* @__PURE__ */ e.jsx("button", { onClick: () => i && a("processing"), disabled: !i, style: {
          fontSize: 11,
          color: i ? r.mute : r.hair,
          background: "transparent",
          border: "none",
          cursor: i ? "pointer" : "not-allowed",
          fontFamily: "inherit",
          textDecoration: "underline"
        }, children: "Simulate" })
      ] })
    ] }) : /* @__PURE__ */ e.jsxs(S, { gap: 10, children: [
      /* @__PURE__ */ e.jsxs(S, { gap: 6, children: [
        /* @__PURE__ */ e.jsxs("label", { style: { fontSize: 10.5, color: r.mute, textTransform: "uppercase", letterSpacing: 0.6 }, children: [
          "Your refund wallet on ",
          L.name
        ] }),
        /* @__PURE__ */ e.jsx(
          "input",
          {
            autoFocus: !0,
            placeholder: Pn[L.id] ?? "Paste your wallet address",
            value: w,
            onChange: (R) => I(R.target.value),
            onKeyDown: (R) => {
              R.key === "Enter" && me();
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
          /* @__PURE__ */ e.jsx("b", { children: L.name }),
          "."
        ] })
      ] }),
      /* @__PURE__ */ e.jsx(
        "button",
        {
          onClick: me,
          disabled: !w.trim(),
          style: {
            ...ze,
            opacity: w.trim() ? 1 : 0.5,
            cursor: w.trim() ? "pointer" : "not-allowed"
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
const Qt = {
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
}, dt = {
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
function _n({
  merchant: a,
  value: s,
  onChange: l,
  onSubmit: f,
  submitting: g,
  error: u
}) {
  const y = Qt[a.currency] ?? [], m = s.institution.length > 0 && s.accountIdentifier.trim().length >= 8 && s.accountName.trim().length >= 2;
  return /* @__PURE__ */ e.jsxs(S, { gap: 14, style: { padding: "16px 20px 6px" }, children: [
    /* @__PURE__ */ e.jsxs(S, { gap: 4, children: [
      /* @__PURE__ */ e.jsx("div", { style: { fontSize: 18, fontWeight: 600, letterSpacing: -0.3 }, children: "Where should refunds go?" }),
      /* @__PURE__ */ e.jsx("div", { style: { fontSize: 12.5, color: r.mute, lineHeight: 1.5 }, children: "If your payment can't be matched, we'll return the funds to this account. Must be in your name." })
    ] }),
    /* @__PURE__ */ e.jsxs(S, { gap: 10, children: [
      /* @__PURE__ */ e.jsxs(S, { gap: 6, children: [
        /* @__PURE__ */ e.jsx("label", { style: { fontSize: 10.5, color: r.mute, textTransform: "uppercase", letterSpacing: 0.6 }, children: "Bank" }),
        /* @__PURE__ */ e.jsxs(
          "select",
          {
            value: s.institution,
            onChange: (t) => l({ ...s, institution: t.target.value }),
            style: { ...dt, appearance: "none", backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 24 24' fill='none'><path d='M6 9L12 15L18 9' stroke='%236B7572' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'/></svg>")`, backgroundRepeat: "no-repeat", backgroundPosition: "right 12px center", paddingRight: 36 },
            children: [
              /* @__PURE__ */ e.jsx("option", { value: "", disabled: !0, children: "Select your bank…" }),
              y.map((t) => /* @__PURE__ */ e.jsx("option", { value: t.code, children: t.name }, t.code))
            ]
          }
        )
      ] }),
      /* @__PURE__ */ e.jsxs(S, { gap: 6, children: [
        /* @__PURE__ */ e.jsx("label", { style: { fontSize: 10.5, color: r.mute, textTransform: "uppercase", letterSpacing: 0.6 }, children: "Account number" }),
        /* @__PURE__ */ e.jsx(
          "input",
          {
            inputMode: "numeric",
            placeholder: "0123456789",
            value: s.accountIdentifier,
            onChange: (t) => l({ ...s, accountIdentifier: t.target.value.replace(/\D/g, "") }),
            style: { ...dt, fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", letterSpacing: -0.2 }
          }
        )
      ] }),
      /* @__PURE__ */ e.jsxs(S, { gap: 6, children: [
        /* @__PURE__ */ e.jsx("label", { style: { fontSize: 10.5, color: r.mute, textTransform: "uppercase", letterSpacing: 0.6 }, children: "Account name" }),
        /* @__PURE__ */ e.jsx(
          "input",
          {
            placeholder: "Full name as it appears on your account",
            value: s.accountName,
            onChange: (t) => l({ ...s, accountName: t.target.value }),
            style: dt
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
    u && /* @__PURE__ */ e.jsx("div", { style: {
      background: "#FBEEE9",
      border: `1px solid ${r.err}33`,
      borderRadius: 10,
      padding: "10px 12px",
      fontSize: 12,
      color: r.err,
      lineHeight: 1.5
    }, children: u }),
    /* @__PURE__ */ e.jsx(
      "button",
      {
        onClick: f,
        disabled: !m || g,
        style: { ...ze, opacity: m && !g ? 1 : 0.5, cursor: m && !g ? "pointer" : "not-allowed" },
        children: g ? "Creating payment…" : "Continue"
      }
    )
  ] });
}
const $n = {
  NGN: { bank: "Wema Bank", accountNumber: "8203 7461 92", accountName: "Weave / Afriloom-0481" }
};
function Xt(a, s) {
  const l = (Qt[a] ?? []).find((f) => f.code === s);
  return (l == null ? void 0 : l.name) ?? s;
}
function Un({
  onNext: a,
  merchant: s,
  bankDetails: l,
  apiKey: f,
  orderId: g
}) {
  const u = se[s.currency], y = l ? {
    bank: Xt(s.currency, l.institution),
    accountNumber: l.accountIdentifier,
    accountName: l.accountName
  } : $n[s.currency], m = l != null && l.amountToTransfer ? (() => {
    const k = l.amountToTransfer, C = k.includes(".") ? k.split(".")[1].length : 0;
    return xe(Number(k), s.currency, C);
  })() : xe(s.amount, s.currency), [t, o] = F(null), [i, c] = F(9), [d, x] = F(42);
  Le(() => {
    const k = setInterval(() => {
      x((C) => C > 0 ? C - 1 : (c((j) => Math.max(0, j - 1)), 59));
    }, 1e3);
    return () => clearInterval(k);
  }, []), Le(() => {
    if (!g) return;
    let k = !1, C;
    const j = async () => {
      if (!k) {
        try {
          const w = await Ke(f, g), I = String(w.status ?? "").toLowerCase();
          if (I && I !== "awaiting_deposit") {
            k = !0, I === "completed" ? a("success") : ["failed", "refunded"].includes(I) ? a("error") : a("processing");
            return;
          }
        } catch {
        }
        C = setTimeout(j, 5e3);
      }
    };
    return j(), () => {
      k = !0, clearTimeout(C);
    };
  }, [f, g, a]);
  const h = (k, C) => {
    var j;
    (j = navigator.clipboard) == null || j.writeText(C), o(k), setTimeout(() => o(null), 1400);
  }, b = ({ label: k, value: C, k: j, mono: w = !0 }) => /* @__PURE__ */ e.jsxs(V, { justify: "space-between", style: { padding: "11px 14px" }, children: [
    /* @__PURE__ */ e.jsxs(S, { gap: 2, style: { minWidth: 0 }, children: [
      /* @__PURE__ */ e.jsx("div", { style: { fontSize: 10.5, color: r.mute, textTransform: "uppercase", letterSpacing: 0.6 }, children: k }),
      /* @__PURE__ */ e.jsx("div", { style: {
        fontSize: 14,
        fontWeight: 500,
        color: r.ink,
        fontFamily: w ? "ui-monospace, SFMono-Regular, Menlo, monospace" : "inherit",
        letterSpacing: w ? -0.2 : 0,
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap"
      }, children: C })
    ] }),
    /* @__PURE__ */ e.jsx("button", { onClick: () => h(j, C), style: {
      height: 28,
      padding: "0 10px",
      borderRadius: 7,
      border: `1px solid ${r.hair}`,
      background: t === j ? r.accentSoft : "#fff",
      color: t === j ? r.accent : r.ink,
      fontSize: 11.5,
      fontWeight: 500,
      cursor: "pointer",
      fontFamily: "inherit",
      display: "flex",
      alignItems: "center",
      gap: 5
    }, children: t === j ? /* @__PURE__ */ e.jsxs(e.Fragment, { children: [
      /* @__PURE__ */ e.jsx("svg", { width: "10", height: "10", viewBox: "0 0 24 24", fill: "none", children: /* @__PURE__ */ e.jsx("path", { d: "M5 12L10 17L19 7", stroke: "currentColor", strokeWidth: "3", strokeLinecap: "round", strokeLinejoin: "round" }) }),
      "Copied"
    ] }) : "Copy" })
  ] });
  return /* @__PURE__ */ e.jsxs(S, { gap: 14, style: { padding: "16px 20px 6px" }, children: [
    /* @__PURE__ */ e.jsxs(S, { gap: 4, children: [
      /* @__PURE__ */ e.jsxs(V, { justify: "space-between", align: "flex-start", children: [
        /* @__PURE__ */ e.jsxs("div", { style: { fontSize: 18, fontWeight: 600, letterSpacing: -0.3 }, children: [
          "Send ",
          m
        ] }),
        /* @__PURE__ */ e.jsxs(gt, { tone: "warn", children: [
          /* @__PURE__ */ e.jsxs("svg", { width: "10", height: "10", viewBox: "0 0 24 24", fill: "none", style: { marginRight: 2 }, children: [
            /* @__PURE__ */ e.jsx("circle", { cx: "12", cy: "12", r: "10", stroke: "currentColor", strokeWidth: "2" }),
            /* @__PURE__ */ e.jsx("path", { d: "M12 7V12L15 14", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round" })
          ] }),
          i,
          ":",
          String(d).padStart(2, "0")
        ] })
      ] }),
      /* @__PURE__ */ e.jsx("div", { style: { fontSize: 12.5, color: r.mute, lineHeight: 1.5 }, children: "Open your bank app and transfer to this account. We'll confirm your payment automatically — no need to send proof." })
    ] }),
    /* @__PURE__ */ e.jsxs("div", { style: { background: "#fff", border: `1px solid ${r.hair}`, borderRadius: 12, overflow: "hidden" }, children: [
      /* @__PURE__ */ e.jsxs(V, { gap: 10, style: { padding: "12px 14px", background: r.panel, borderBottom: `1px solid ${r.hair}` }, children: [
        /* @__PURE__ */ e.jsx("div", { style: { width: 28, height: 28, borderRadius: 14, background: "#fff", border: `1px solid ${r.hair}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 600, color: r.ink }, children: u.flag }),
        /* @__PURE__ */ e.jsxs(S, { gap: 1, style: { flex: 1 }, children: [
          /* @__PURE__ */ e.jsx("div", { style: { fontSize: 13, fontWeight: 500 }, children: y.bank }),
          /* @__PURE__ */ e.jsxs("div", { style: { fontSize: 11, color: r.mute }, children: [
            "Virtual account · one-time · ",
            s.currency
          ] })
        ] })
      ] }),
      /* @__PURE__ */ e.jsx(b, { label: "Account number", value: y.accountNumber, k: "acc" }),
      /* @__PURE__ */ e.jsx(Pe, {}),
      /* @__PURE__ */ e.jsx(b, { label: "Account name", value: y.accountName, k: "name", mono: !1 }),
      /* @__PURE__ */ e.jsx(Pe, {}),
      /* @__PURE__ */ e.jsx(b, { label: "Amount", value: m, k: "amt", mono: !1 })
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
      /* @__PURE__ */ e.jsx("button", { onClick: () => a("processing"), style: {
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
}, Ft = {
  Base: "BASE",
  Optimism: "OPTIMISM",
  Ethereum: "ETHEREUM",
  Arbitrum: "ARBITRUM",
  Polygon: "POLYGON"
};
function Xn({
  merchant: a = Hn,
  apiKey: s,
  userAddress: l,
  onSuccess: f,
  onError: g
}) {
  const u = s ?? (Ne == null ? void 0 : Ne.VITE_WEAVE_API_KEY) ?? "pk_test_123", y = l ?? (Ne == null ? void 0 : Ne.VITE_WEAVE_DEMO_USER_ADDRESS) ?? "0x0000000000000000000000000000000000000000", [m, t] = F("connect"), [o, i] = F("offramp"), [c, d] = F(0), [x, h] = F(!1), [b, k] = F({
    institution: "",
    accountIdentifier: "",
    accountName: ""
  }), [C, j] = F(null), [w, I] = F(null), [G, K] = F(null), [he, q] = F(null), [ae, fe] = F(null), [Y, L] = F(null), [z, N] = F(null), [$, pe] = F(!1), [le, te] = F(null), [ce, de] = F(null), [me, ye] = F(!1), [ke, R] = F(!1), [U, ne] = F(null), re = Qe(0), ie = Qe(0), Se = (O) => {
    ne(null), j(null), K(null), q(null), te(null), I(null), de(null), O === "fiat" ? (i("onramp"), t("refundAccount")) : O === "crypto" ? (i("offramp"), t("wallet")) : O === "deposit" && (i("offramp"), t("deposit"));
  }, Ce = async (O, Q, J) => {
    const Re = ++re.current;
    pe(!0), te(null), K(null), q(null), fe(null), L(null), N(null);
    try {
      const je = ot(O, Q), Ae = Ve(a.currency), He = await st(u, {
        from: je,
        to: Ae,
        amount: a.amount,
        amountIn: "dest"
      }), ge = await at(u, {
        source: {
          inline: { kind: "crypto_wallet", assetKey: je, walletAddress: "" }
        },
        // Deposit amount is source-asset-denominated (e.g. SOL), NOT USD.
        // The backend feeds this straight into NEAR Intents as amountIn.
        amount: He.breakdown.sourceAmount,
        refundAddress: J
      });
      if (re.current !== Re) return;
      j(ge.order.id), K(ge.nextAction.depositAddress ?? null), q(ge.nextAction.depositMemo ?? null), fe(typeof ge.nextAction.amount == "number" ? ge.nextAction.amount : null), L(ge.nextAction.token ?? Q), N(ge.nextAction.chain ?? O);
    } catch (je) {
      if (re.current !== Re) return;
      te(je.message ?? "Could not generate a deposit address"), g == null || g(je);
    } finally {
      re.current === Re && pe(!1);
    }
  }, De = async () => {
    t("quote");
    const O = Ge[c ?? 0], Q = ++ie.current;
    ye(!0), de(null);
    try {
      const J = await st(u, {
        from: ot(Ft[O.chain] ?? O.chain, O.token),
        to: Ve(a.currency),
        amount: a.amount,
        amountIn: "dest"
      });
      if (ie.current !== Q) return;
      de({
        estimatedFiat: J.estimatedDest,
        netUsdc: J.breakdown.netUsd,
        fiatCurrency: a.currency,
        breakdown: {
          inputAmount: J.breakdown.usdEquivalent,
          inputToken: O.token,
          fastPath: J.route.steps.length === 1,
          bridgeFeeUsd: J.breakdown.bridgeFeeUsd,
          senderFeeUsd: J.breakdown.senderFeeUsd,
          appFeeUsd: J.breakdown.appFeeUsd,
          sellRate: J.breakdown.sellRate ?? 0
        }
      });
    } catch {
    } finally {
      ie.current === Q && ye(!1);
    }
  }, oe = (O) => {
    O === "success" && f && C && f({ orderId: C, status: "completed" }), t(O);
  }, qe = async () => {
    R(!0), ne(null);
    try {
      const O = {
        inline: {
          kind: "bank_account",
          assetKey: Ve(a.currency),
          bankInstitution: b.institution,
          bankAccountIdentifier: b.accountIdentifier,
          bankAccountName: b.accountName
        }
      }, Q = await at(u, { source: O, amount: a.amount });
      j(Q.order.id), I(Q.nextAction.bankDetails ?? null), t("vaccount");
    } catch (O) {
      ne(O.message ?? "Failed to create order"), g == null || g(O);
    } finally {
      R(!1);
    }
  }, Ze = async () => {
    const O = Ge[c ?? 0];
    R(!0), ne(null);
    try {
      const Q = ot(Ft[O.chain] ?? O.chain, O.token), J = Ve(a.currency), Re = await st(u, {
        from: Q,
        to: J,
        amount: a.amount,
        amountIn: "dest"
      }), Ae = await at(u, { source: {
        inline: { kind: "crypto_wallet", assetKey: Q, walletAddress: y }
      }, amount: Re.breakdown.sourceAmount });
      j(Ae.order.id), K(Ae.nextAction.depositAddress ?? null), t("processing");
    } catch (Q) {
      ne(Q.message ?? "Failed to create order"), g == null || g(Q);
    } finally {
      R(!1);
    }
  };
  if (x)
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
    }, onClick: () => h(!1), children: [
      /* @__PURE__ */ e.jsx(xt, { size: 16 }),
      "Pay with Weave"
    ] });
  const be = Ge[c ?? 0], ve = o === "onramp", Ee = (O) => {
    j(null), ne(null), I(null), K(null), q(null), te(null), de(null), t(O);
  }, Ue = (() => {
    if (m === "connect") return /* @__PURE__ */ e.jsx(Ln, { onPick: Se, merchant: a });
    if (ve) {
      if (m === "refundAccount") return /* @__PURE__ */ e.jsx(_n, { merchant: a, value: b, onChange: k, onSubmit: qe, submitting: ke, error: U });
      if (m === "vaccount") return /* @__PURE__ */ e.jsx(Un, { onNext: oe, merchant: a, bankDetails: w, apiKey: u, orderId: C });
      if (m === "processing") return /* @__PURE__ */ e.jsx(Lt, { onNext: oe, merchant: a, mode: "fiat", apiKey: u, orderId: C, bankDetails: w });
      if (m === "success") return /* @__PURE__ */ e.jsx(Mt, { onNext: oe, balance: be, merchant: a, direction: o, apiKey: u, orderId: C });
      if (m === "error") return /* @__PURE__ */ e.jsx(It, { onNext: () => Ee("connect"), onBack: () => Ee("refundAccount") });
    } else {
      if (m === "deposit") return /* @__PURE__ */ e.jsx(Wn, { onNext: oe, merchant: a, depositAddress: G, depositMemo: he, amountToSend: ae, sourceToken: Y, sourceChain: z, loading: $, error: le, onChainChange: Ce, ready: !!C && !!G && !$, apiKey: u, orderId: C });
      if (m === "wallet") return /* @__PURE__ */ e.jsx(Mn, { onNext: () => De(), merchant: a, balances: Ge, selected: c, setSelected: d });
      if (m === "quote") return /* @__PURE__ */ e.jsx(In, { merchant: a, balance: be, onConfirm: Ze, submitting: ke, error: U, quote: ce, quoteLoading: me });
      if (m === "processing") return /* @__PURE__ */ e.jsx(Lt, { onNext: oe, merchant: a, mode: "crypto", apiKey: u, orderId: C });
      if (m === "success") return /* @__PURE__ */ e.jsx(Mt, { onNext: oe, balance: be, merchant: a, direction: o, apiKey: u, orderId: C });
      if (m === "error") return /* @__PURE__ */ e.jsx(It, { onNext: () => Ee("connect"), onBack: () => Ee("quote") });
    }
    return null;
  })(), Ie = ["wallet", "quote", "deposit"].includes(m) && !ve || ["refundAccount", "vaccount"].includes(m) && ve, Je = m === "quote" ? "wallet" : m === "vaccount" ? "refundAccount" : "connect";
  return /* @__PURE__ */ e.jsxs("div", { style: {
    width: 400,
    background: r.surface,
    borderRadius: 16,
    boxShadow: "0 30px 80px rgba(11, 15, 14, 0.22), 0 0 0 1px rgba(0,0,0,0.04)",
    overflow: "hidden",
    fontFamily: "Inter, -apple-system, BlinkMacSystemFont, sans-serif",
    color: r.ink,
    animation: "wslide 0.35s cubic-bezier(0.2, 1, 0.3, 1)"
  }, children: [
    /* @__PURE__ */ e.jsx(
      An,
      {
        merchantName: a.name,
        onClose: () => h(!0),
        showBack: Ie,
        onBack: () => t(Je)
      }
    ),
    /* @__PURE__ */ e.jsx("div", { style: { animation: "wfade 0.25s ease" }, children: Ue }, m),
    /* @__PURE__ */ e.jsx(Tn, {})
  ] });
}
const X = {
  ink: "#0B0F0E",
  ink2: "#3A4240",
  mute: "#6B7572",
  hair: "#E8EAE6",
  page: "#F5F4EF"
}, Vn = { NGN: "₦" }, Ye = (a, s) => `${Vn[s] ?? ""}${new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(a)}`;
function Kn({ currency: a = "NGN", amount: s = 15e4 }) {
  const l = [
    { name: "Ẹ̀wà Handwoven Throw", sub: "Indigo / 150 × 200cm", price: 12e4 },
    { name: "Aso-Oke Runner", sub: "Earth / 35 × 180cm", price: 25e3 }
  ];
  return /* @__PURE__ */ e.jsxs("div", { style: {
    position: "absolute",
    inset: 0,
    background: X.page,
    fontFamily: "Inter, -apple-system, sans-serif",
    color: X.ink,
    overflow: "hidden"
  }, children: [
    /* @__PURE__ */ e.jsxs("div", { style: {
      height: 56,
      padding: "0 32px",
      borderBottom: `1px solid ${X.hair}`,
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
        /* @__PURE__ */ e.jsx("span", { style: { color: X.mute, fontSize: 13, marginLeft: 16 }, children: "Shop · Journal · About" })
      ] }),
      /* @__PURE__ */ e.jsxs("div", { style: { marginLeft: "auto", display: "flex", gap: 14, fontSize: 13, color: X.ink2 }, children: [
        /* @__PURE__ */ e.jsx("span", { children: "Search" }),
        /* @__PURE__ */ e.jsx("span", { children: "Account" }),
        /* @__PURE__ */ e.jsx("span", { children: "Cart (2)" })
      ] })
    ] }),
    /* @__PURE__ */ e.jsxs("div", { style: { display: "flex", padding: "32px 32px", gap: 40, height: "calc(100% - 56px)" }, children: [
      /* @__PURE__ */ e.jsxs("div", { style: { flex: "0 0 340px" }, children: [
        /* @__PURE__ */ e.jsx("div", { style: { fontSize: 11, color: X.mute, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 14 }, children: "Order summary" }),
        l.map((f, g) => /* @__PURE__ */ e.jsxs("div", { style: { display: "flex", gap: 14, padding: "12px 0", borderBottom: `1px solid ${X.hair}` }, children: [
          /* @__PURE__ */ e.jsx("div", { style: {
            width: 60,
            height: 72,
            borderRadius: 6,
            flexShrink: 0,
            background: g === 0 ? "repeating-linear-gradient(90deg, #2D3E60 0 6px, #1F2D45 6px 12px, #3A4F75 12px 16px)" : "repeating-linear-gradient(0deg, #8B6D47 0 4px, #6B5236 4px 8px, #A8855D 8px 14px)"
          } }),
          /* @__PURE__ */ e.jsxs("div", { style: { flex: 1, fontSize: 12.5 }, children: [
            /* @__PURE__ */ e.jsx("div", { style: { fontWeight: 500 }, children: f.name }),
            /* @__PURE__ */ e.jsx("div", { style: { color: X.mute, fontSize: 11.5, marginTop: 2 }, children: f.sub }),
            /* @__PURE__ */ e.jsx("div", { style: { marginTop: 4 }, children: Ye(f.price, a) })
          ] })
        ] }, g)),
        /* @__PURE__ */ e.jsxs("div", { style: { padding: "12px 0", fontSize: 12.5, display: "flex", flexDirection: "column", gap: 6 }, children: [
          /* @__PURE__ */ e.jsxs("div", { style: { display: "flex", justifyContent: "space-between", color: X.mute }, children: [
            /* @__PURE__ */ e.jsx("span", { children: "Subtotal" }),
            /* @__PURE__ */ e.jsx("span", { children: Ye(145e3, a) })
          ] }),
          /* @__PURE__ */ e.jsxs("div", { style: { display: "flex", justifyContent: "space-between", color: X.mute }, children: [
            /* @__PURE__ */ e.jsx("span", { children: "Shipping" }),
            /* @__PURE__ */ e.jsx("span", { children: Ye(5e3, a) })
          ] }),
          /* @__PURE__ */ e.jsxs("div", { style: { display: "flex", justifyContent: "space-between", fontWeight: 600, fontSize: 14, marginTop: 6, color: X.ink }, children: [
            /* @__PURE__ */ e.jsx("span", { children: "Total" }),
            /* @__PURE__ */ e.jsx("span", { children: Ye(s, a) })
          ] })
        ] })
      ] }),
      /* @__PURE__ */ e.jsxs("div", { style: { flex: 1, maxWidth: 440 }, children: [
        /* @__PURE__ */ e.jsx("div", { style: { fontSize: 11, color: X.mute, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 14 }, children: "Payment" }),
        /* @__PURE__ */ e.jsxs("div", { style: { display: "flex", flexDirection: "column", gap: 10, opacity: 0.4 }, children: [
          /* @__PURE__ */ e.jsx("div", { style: { height: 42, border: `1px solid ${X.hair}`, borderRadius: 8, background: "#fff", display: "flex", alignItems: "center", padding: "0 14px", fontSize: 13, color: X.mute }, children: "Email" }),
          /* @__PURE__ */ e.jsx("div", { style: { height: 42, border: `1px solid ${X.hair}`, borderRadius: 8, background: "#fff", display: "flex", alignItems: "center", padding: "0 14px", fontSize: 13, color: X.mute }, children: "Card number" }),
          /* @__PURE__ */ e.jsxs("div", { style: { display: "flex", gap: 10 }, children: [
            /* @__PURE__ */ e.jsx("div", { style: { flex: 1, height: 42, border: `1px solid ${X.hair}`, borderRadius: 8, background: "#fff" } }),
            /* @__PURE__ */ e.jsx("div", { style: { flex: 1, height: 42, border: `1px solid ${X.hair}`, borderRadius: 8, background: "#fff" } })
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
  Kn as MerchantBackdrop,
  Xn as WeaveCheckout
};
