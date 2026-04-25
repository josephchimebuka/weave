import G, { useState as L, useRef as ot, useEffect as Ee } from "react";
var bt = { exports: {} }, Ke = {};
/**
 * @license React
 * react-jsx-runtime.production.min.js
 *
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
var Bt;
function hn() {
  if (Bt) return Ke;
  Bt = 1;
  var a = G, o = Symbol.for("react.element"), d = Symbol.for("react.fragment"), h = Object.prototype.hasOwnProperty, p = a.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED.ReactCurrentOwner, l = { key: !0, ref: !0, __self: !0, __source: !0 };
  function j(g, t, n) {
    var s, c = {}, u = null, y = null;
    n !== void 0 && (u = "" + n), t.key !== void 0 && (u = "" + t.key), t.ref !== void 0 && (y = t.ref);
    for (s in t) h.call(t, s) && !l.hasOwnProperty(s) && (c[s] = t[s]);
    if (g && g.defaultProps) for (s in t = g.defaultProps, t) c[s] === void 0 && (c[s] = t[s]);
    return { $$typeof: o, type: g, key: u, ref: y, props: c, _owner: p.current };
  }
  return Ke.Fragment = d, Ke.jsx = j, Ke.jsxs = j, Ke;
}
var Xe = {};
/**
 * @license React
 * react-jsx-runtime.development.js
 *
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
var Ft;
function fn() {
  return Ft || (Ft = 1, process.env.NODE_ENV !== "production" && function() {
    var a = G, o = Symbol.for("react.element"), d = Symbol.for("react.portal"), h = Symbol.for("react.fragment"), p = Symbol.for("react.strict_mode"), l = Symbol.for("react.profiler"), j = Symbol.for("react.provider"), g = Symbol.for("react.context"), t = Symbol.for("react.forward_ref"), n = Symbol.for("react.suspense"), s = Symbol.for("react.suspense_list"), c = Symbol.for("react.memo"), u = Symbol.for("react.lazy"), y = Symbol.for("react.offscreen"), m = Symbol.iterator, w = "@@iterator";
    function S(r) {
      if (r === null || typeof r != "object")
        return null;
      var f = m && r[m] || r[w];
      return typeof f == "function" ? f : null;
    }
    var E = a.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED;
    function x(r) {
      {
        for (var f = arguments.length, b = new Array(f > 1 ? f - 1 : 0), A = 1; A < f; A++)
          b[A - 1] = arguments[A];
        k("error", r, b);
      }
    }
    function k(r, f, b) {
      {
        var A = E.ReactDebugCurrentFrame, N = A.getStackAddendum();
        N !== "" && (f += "%s", b = b.concat([N]));
        var P = b.map(function(M) {
          return String(M);
        });
        P.unshift("Warning: " + f), Function.prototype.apply.call(console[r], console, P);
      }
    }
    var R = !1, O = !1, V = !1, Q = !1, Z = !1, J;
    J = Symbol.for("react.module.reference");
    function he(r) {
      return !!(typeof r == "string" || typeof r == "function" || r === h || r === l || Z || r === p || r === n || r === s || Q || r === y || R || O || V || typeof r == "object" && r !== null && (r.$$typeof === u || r.$$typeof === c || r.$$typeof === j || r.$$typeof === g || r.$$typeof === t || // This needs to include all possible module reference object
      // types supported by any Flight configuration anywhere since
      // we don't know which Flight build this will end up being used
      // with.
      r.$$typeof === J || r.getModuleId !== void 0));
    }
    function X(r, f, b) {
      var A = r.displayName;
      if (A)
        return A;
      var N = f.displayName || f.name || "";
      return N !== "" ? b + "(" + N + ")" : b;
    }
    function se(r) {
      return r.displayName || "Context";
    }
    function ee(r) {
      if (r == null)
        return null;
      if (typeof r.tag == "number" && x("Received an unexpected object in getComponentNameFromType(). This is likely a bug in React. Please file an issue."), typeof r == "function")
        return r.displayName || r.name || null;
      if (typeof r == "string")
        return r;
      switch (r) {
        case h:
          return "Fragment";
        case d:
          return "Portal";
        case l:
          return "Profiler";
        case p:
          return "StrictMode";
        case n:
          return "Suspense";
        case s:
          return "SuspenseList";
      }
      if (typeof r == "object")
        switch (r.$$typeof) {
          case g:
            var f = r;
            return se(f) + ".Consumer";
          case j:
            var b = r;
            return se(b._context) + ".Provider";
          case t:
            return X(r, r.render, "ForwardRef");
          case c:
            var A = r.displayName || null;
            return A !== null ? A : ee(r.type) || "Memo";
          case u: {
            var N = r, P = N._payload, M = N._init;
            try {
              return ee(M(P));
            } catch {
              return null;
            }
          }
        }
      return null;
    }
    var U = Object.assign, z = 0, ge, de, I, ne, te, ke, we;
    function Ae() {
    }
    Ae.__reactDisabledLog = !0;
    function me() {
      {
        if (z === 0) {
          ge = console.log, de = console.info, I = console.warn, ne = console.error, te = console.group, ke = console.groupCollapsed, we = console.groupEnd;
          var r = {
            configurable: !0,
            enumerable: !0,
            value: Ae,
            writable: !0
          };
          Object.defineProperties(console, {
            info: r,
            log: r,
            warn: r,
            error: r,
            group: r,
            groupCollapsed: r,
            groupEnd: r
          });
        }
        z++;
      }
    }
    function Re() {
      {
        if (z--, z === 0) {
          var r = {
            configurable: !0,
            enumerable: !0,
            writable: !0
          };
          Object.defineProperties(console, {
            log: U({}, r, {
              value: ge
            }),
            info: U({}, r, {
              value: de
            }),
            warn: U({}, r, {
              value: I
            }),
            error: U({}, r, {
              value: ne
            }),
            group: U({}, r, {
              value: te
            }),
            groupCollapsed: U({}, r, {
              value: ke
            }),
            groupEnd: U({}, r, {
              value: we
            })
          });
        }
        z < 0 && x("disabledDepth fell below zero. This is a bug in React. Please file an issue.");
      }
    }
    var ye = E.ReactCurrentDispatcher, Te;
    function Se(r, f, b) {
      {
        if (Te === void 0)
          try {
            throw Error();
          } catch (N) {
            var A = N.stack.trim().match(/\n( *(at )?)/);
            Te = A && A[1] || "";
          }
        return `
` + Te + r;
      }
    }
    var Be = !1, fe;
    {
      var Me = typeof WeakMap == "function" ? WeakMap : Map;
      fe = new Me();
    }
    function C(r, f) {
      if (!r || Be)
        return "";
      {
        var b = fe.get(r);
        if (b !== void 0)
          return b;
      }
      var A;
      Be = !0;
      var N = Error.prepareStackTrace;
      Error.prepareStackTrace = void 0;
      var P;
      P = ye.current, ye.current = null, me();
      try {
        if (f) {
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
            } catch (ce) {
              A = ce;
            }
            Reflect.construct(r, [], M);
          } else {
            try {
              M.call();
            } catch (ce) {
              A = ce;
            }
            r.call(M.prototype);
          }
        } else {
          try {
            throw Error();
          } catch (ce) {
            A = ce;
          }
          r();
        }
      } catch (ce) {
        if (ce && A && typeof ce.stack == "string") {
          for (var F = ce.stack.split(`
`), ie = A.stack.split(`
`), H = F.length - 1, Y = ie.length - 1; H >= 1 && Y >= 0 && F[H] !== ie[Y]; )
            Y--;
          for (; H >= 1 && Y >= 0; H--, Y--)
            if (F[H] !== ie[Y]) {
              if (H !== 1 || Y !== 1)
                do
                  if (H--, Y--, Y < 0 || F[H] !== ie[Y]) {
                    var pe = `
` + F[H].replace(" at new ", " at ");
                    return r.displayName && pe.includes("<anonymous>") && (pe = pe.replace("<anonymous>", r.displayName)), typeof r == "function" && fe.set(r, pe), pe;
                  }
                while (H >= 1 && Y >= 0);
              break;
            }
        }
      } finally {
        Be = !1, ye.current = P, Re(), Error.prepareStackTrace = N;
      }
      var $e = r ? r.displayName || r.name : "", Oe = $e ? Se($e) : "";
      return typeof r == "function" && fe.set(r, Oe), Oe;
    }
    function W(r, f, b) {
      return C(r, !1);
    }
    function Pe(r) {
      var f = r.prototype;
      return !!(f && f.isReactComponent);
    }
    function ae(r, f, b) {
      if (r == null)
        return "";
      if (typeof r == "function")
        return C(r, Pe(r));
      if (typeof r == "string")
        return Se(r);
      switch (r) {
        case n:
          return Se("Suspense");
        case s:
          return Se("SuspenseList");
      }
      if (typeof r == "object")
        switch (r.$$typeof) {
          case t:
            return W(r.render);
          case c:
            return ae(r.type, f, b);
          case u: {
            var A = r, N = A._payload, P = A._init;
            try {
              return ae(P(N), f, b);
            } catch {
            }
          }
        }
      return "";
    }
    var le = Object.prototype.hasOwnProperty, re = {}, Ve = E.ReactDebugCurrentFrame;
    function oe(r) {
      if (r) {
        var f = r._owner, b = ae(r.type, r._source, f ? f.type : null);
        Ve.setExtraStackFrame(b);
      } else
        Ve.setExtraStackFrame(null);
    }
    function De(r, f, b, A, N) {
      {
        var P = Function.call.bind(le);
        for (var M in r)
          if (P(r, M)) {
            var F = void 0;
            try {
              if (typeof r[M] != "function") {
                var ie = Error((A || "React class") + ": " + b + " type `" + M + "` is invalid; it must be a function, usually from the `prop-types` package, but received `" + typeof r[M] + "`.This often happens because of typos such as `PropTypes.function` instead of `PropTypes.func`.");
                throw ie.name = "Invariant Violation", ie;
              }
              F = r[M](f, M, A, b, null, "SECRET_DO_NOT_PASS_THIS_OR_YOU_WILL_BE_FIRED");
            } catch (H) {
              F = H;
            }
            F && !(F instanceof Error) && (oe(N), x("%s: type specification of %s `%s` is invalid; the type checker function must return `null` or an `Error` but returned a %s. You may have forgotten to pass an argument to the type checker creator (arrayOf, instanceOf, objectOf, oneOf, oneOfType, and shape all require an argument).", A || "React class", b, M, typeof F), oe(null)), F instanceof Error && !(F.message in re) && (re[F.message] = !0, oe(N), x("Failed %s type: %s", b, F.message), oe(null));
          }
      }
    }
    var ct = Array.isArray;
    function Qe(r) {
      return ct(r);
    }
    function Fe(r) {
      {
        var f = typeof Symbol == "function" && Symbol.toStringTag, b = f && r[Symbol.toStringTag] || r.constructor.name || "Object";
        return b;
      }
    }
    function dt(r) {
      try {
        return Ze(r), !1;
      } catch {
        return !0;
      }
    }
    function Ze(r) {
      return "" + r;
    }
    function Ue(r) {
      if (dt(r))
        return x("The provided key is an unsupported type %s. This value must be coerced to a string before before using it here.", Fe(r)), Ze(r);
    }
    var _e = E.ReactCurrentOwner, ze = {
      key: !0,
      ref: !0,
      __self: !0,
      __source: !0
    }, Je, et;
    function ut(r) {
      if (le.call(r, "ref")) {
        var f = Object.getOwnPropertyDescriptor(r, "ref").get;
        if (f && f.isReactWarning)
          return !1;
      }
      return r.ref !== void 0;
    }
    function T(r) {
      if (le.call(r, "key")) {
        var f = Object.getOwnPropertyDescriptor(r, "key").get;
        if (f && f.isReactWarning)
          return !1;
      }
      return r.key !== void 0;
    }
    function D(r, f) {
      typeof r.ref == "string" && _e.current;
    }
    function $(r, f) {
      {
        var b = function() {
          Je || (Je = !0, x("%s: `key` is not a prop. Trying to access it will result in `undefined` being returned. If you need to access the same value within the child component, you should pass it as a different prop. (https://reactjs.org/link/special-props)", f));
        };
        b.isReactWarning = !0, Object.defineProperty(r, "key", {
          get: b,
          configurable: !0
        });
      }
    }
    function be(r, f) {
      {
        var b = function() {
          et || (et = !0, x("%s: `ref` is not a prop. Trying to access it will result in `undefined` being returned. If you need to access the same value within the child component, you should pass it as a different prop. (https://reactjs.org/link/special-props)", f));
        };
        b.isReactWarning = !0, Object.defineProperty(r, "ref", {
          get: b,
          configurable: !0
        });
      }
    }
    var ve = function(r, f, b, A, N, P, M) {
      var F = {
        // This tag allows us to uniquely identify this as a React Element
        $$typeof: o,
        // Built-in properties that belong on the element
        type: r,
        key: f,
        ref: b,
        props: M,
        // Record the component responsible for creating this element.
        _owner: P
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
        value: N
      }), Object.freeze && (Object.freeze(F.props), Object.freeze(F)), F;
    };
    function Ie(r, f, b, A, N) {
      {
        var P, M = {}, F = null, ie = null;
        b !== void 0 && (Ue(b), F = "" + b), T(f) && (Ue(f.key), F = "" + f.key), ut(f) && (ie = f.ref, D(f, N));
        for (P in f)
          le.call(f, P) && !ze.hasOwnProperty(P) && (M[P] = f[P]);
        if (r && r.defaultProps) {
          var H = r.defaultProps;
          for (P in H)
            M[P] === void 0 && (M[P] = H[P]);
        }
        if (F || ie) {
          var Y = typeof r == "function" ? r.displayName || r.name || "Unknown" : r;
          F && $(M, Y), ie && be(M, Y);
        }
        return ve(r, F, ie, N, A, _e.current, M);
      }
    }
    var xe = E.ReactCurrentOwner, We = E.ReactDebugCurrentFrame;
    function je(r) {
      if (r) {
        var f = r._owner, b = ae(r.type, r._source, f ? f.type : null);
        We.setExtraStackFrame(b);
      } else
        We.setExtraStackFrame(null);
    }
    var ue;
    ue = !1;
    function ht(r) {
      return typeof r == "object" && r !== null && r.$$typeof === o;
    }
    function jt() {
      {
        if (xe.current) {
          var r = ee(xe.current.type);
          if (r)
            return `

Check the render method of \`` + r + "`.";
        }
        return "";
      }
    }
    function tn(r) {
      return "";
    }
    var Et = {};
    function nn(r) {
      {
        var f = jt();
        if (!f) {
          var b = typeof r == "string" ? r : r.displayName || r.name;
          b && (f = `

Check the top-level render call using <` + b + ">.");
        }
        return f;
      }
    }
    function Ct(r, f) {
      {
        if (!r._store || r._store.validated || r.key != null)
          return;
        r._store.validated = !0;
        var b = nn(f);
        if (Et[b])
          return;
        Et[b] = !0;
        var A = "";
        r && r._owner && r._owner !== xe.current && (A = " It was passed a child from " + ee(r._owner.type) + "."), je(r), x('Each child in a list should have a unique "key" prop.%s%s See https://reactjs.org/link/warning-keys for more information.', b, A), je(null);
      }
    }
    function At(r, f) {
      {
        if (typeof r != "object")
          return;
        if (Qe(r))
          for (var b = 0; b < r.length; b++) {
            var A = r[b];
            ht(A) && Ct(A, f);
          }
        else if (ht(r))
          r._store && (r._store.validated = !0);
        else if (r) {
          var N = S(r);
          if (typeof N == "function" && N !== r.entries)
            for (var P = N.call(r), M; !(M = P.next()).done; )
              ht(M.value) && Ct(M.value, f);
        }
      }
    }
    function rn(r) {
      {
        var f = r.type;
        if (f == null || typeof f == "string")
          return;
        var b;
        if (typeof f == "function")
          b = f.propTypes;
        else if (typeof f == "object" && (f.$$typeof === t || // Note: Memo only checks outer props here.
        // Inner props are checked in the reconciler.
        f.$$typeof === c))
          b = f.propTypes;
        else
          return;
        if (b) {
          var A = ee(f);
          De(b, r.props, "prop", A, r);
        } else if (f.PropTypes !== void 0 && !ue) {
          ue = !0;
          var N = ee(f);
          x("Component %s declared `PropTypes` instead of `propTypes`. Did you misspell the property assignment?", N || "Unknown");
        }
        typeof f.getDefaultProps == "function" && !f.getDefaultProps.isReactClassApproved && x("getDefaultProps is only used on classic React.createClass definitions. Use a static property named `defaultProps` instead.");
      }
    }
    function on(r) {
      {
        for (var f = Object.keys(r.props), b = 0; b < f.length; b++) {
          var A = f[b];
          if (A !== "children" && A !== "key") {
            je(r), x("Invalid prop `%s` supplied to `React.Fragment`. React.Fragment can only have `key` and `children` props.", A), je(null);
            break;
          }
        }
        r.ref !== null && (je(r), x("Invalid attribute `ref` supplied to `React.Fragment`."), je(null));
      }
    }
    var Rt = {};
    function Tt(r, f, b, A, N, P) {
      {
        var M = he(r);
        if (!M) {
          var F = "";
          (r === void 0 || typeof r == "object" && r !== null && Object.keys(r).length === 0) && (F += " You likely forgot to export your component from the file it's defined in, or you might have mixed up default and named imports.");
          var ie = tn();
          ie ? F += ie : F += jt();
          var H;
          r === null ? H = "null" : Qe(r) ? H = "array" : r !== void 0 && r.$$typeof === o ? (H = "<" + (ee(r.type) || "Unknown") + " />", F = " Did you accidentally export a JSX literal instead of a component?") : H = typeof r, x("React.jsx: type is invalid -- expected a string (for built-in components) or a class/function (for composite components) but got: %s.%s", H, F);
        }
        var Y = Ie(r, f, b, N, P);
        if (Y == null)
          return Y;
        if (M) {
          var pe = f.children;
          if (pe !== void 0)
            if (A)
              if (Qe(pe)) {
                for (var $e = 0; $e < pe.length; $e++)
                  At(pe[$e], r);
                Object.freeze && Object.freeze(pe);
              } else
                x("React.jsx: Static children should always be an array. You are likely explicitly calling React.jsxs or React.jsxDEV. Use the Babel transform instead.");
            else
              At(pe, r);
        }
        if (le.call(f, "key")) {
          var Oe = ee(r), ce = Object.keys(f).filter(function(un) {
            return un !== "key";
          }), ft = ce.length > 0 ? "{key: someKey, " + ce.join(": ..., ") + ": ...}" : "{key: someKey}";
          if (!Rt[Oe + ft]) {
            var dn = ce.length > 0 ? "{" + ce.join(": ..., ") + ": ...}" : "{}";
            x(`A props object containing a "key" prop is being spread into JSX:
  let props = %s;
  <%s {...props} />
React keys must be passed directly to JSX without using spread:
  let props = %s;
  <%s key={someKey} {...props} />`, ft, Oe, dn, Oe), Rt[Oe + ft] = !0;
          }
        }
        return r === h ? on(Y) : rn(Y), Y;
      }
    }
    function sn(r, f, b) {
      return Tt(r, f, b, !0);
    }
    function an(r, f, b) {
      return Tt(r, f, b, !1);
    }
    var ln = an, cn = sn;
    Xe.Fragment = h, Xe.jsx = ln, Xe.jsxs = cn;
  }()), Xe;
}
process.env.NODE_ENV === "production" ? bt.exports = hn() : bt.exports = fn();
var e = bt.exports;
const Pt = [
  { key: "fiat:NGN", name: "Nigerian Naira", symbol: "₦", flag: "🇳🇬", rate: 1515, min: 5e3, country: "Nigeria" }
], pn = [
  { key: "crypto:BASE:USDC", id: "BASE", name: "Base", token: "USDC", tint: "#1C4FE0", icon: "$", network: "Base", logo: "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48/logo.png" },
  { key: "crypto:BASE:ETH", id: "BASE", name: "Base", token: "ETH", tint: "#1C4FE0", icon: "Ξ", network: "Base", logo: "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/info/logo.png" },
  { key: "crypto:BASE:cbBTC", id: "BASE", name: "Base", token: "cbBTC", tint: "#1C4FE0", icon: "₿", network: "Base", logo: "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/base/assets/0xcbB7C0000aB88B473b1f5aFd9ef808440eed33Bf/logo.png" },
  { key: "crypto:ETHEREUM:ETH", id: "ETHEREUM", name: "Ethereum", token: "ETH", tint: "#627EEA", icon: "Ξ", network: "Ethereum", logo: "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/info/logo.png" },
  { key: "crypto:ETHEREUM:USDC", id: "ETHEREUM", name: "Ethereum", token: "USDC", tint: "#627EEA", icon: "$", network: "Ethereum", logo: "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48/logo.png" },
  { key: "crypto:ETHEREUM:cbBTC", id: "ETHEREUM", name: "Ethereum", token: "cbBTC", tint: "#627EEA", icon: "₿", network: "Ethereum", logo: "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xcbB7C0000aB88B473b1f5aFd9ef808440eed33Bf/logo.png" },
  { key: "crypto:ETHEREUM:USDT", id: "ETHEREUM", name: "Ethereum", token: "USDT", tint: "#627EEA", icon: "T", network: "Ethereum", logo: "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xdAC17F958D2ee523a2206206994597C13D831ec7/logo.png" },
  { id: "ETHEREUM", name: "Ethereum", token: "PEPE", tint: "#627EEA", icon: "P", network: "Ethereum", logo: "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0x6982508145454Ce325dDbE47A25d4ec3d2311933/logo.png", key: "crypto:ETHEREUM:PEPE" },
  { key: "crypto:ARBITRUM:ETH", id: "ARBITRUM", name: "Arbitrum", token: "ETH", tint: "#28A0F0", icon: "Ξ", network: "Arbitrum One", logo: "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/arbitrum/info/logo.png" },
  { key: "crypto:ARBITRUM:USDC", id: "ARBITRUM", name: "Arbitrum", token: "USDC", tint: "#28A0F0", icon: "$", network: "Arbitrum One", logo: "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48/logo.png" },
  { key: "crypto:ARBITRUM:USDT", id: "ARBITRUM", name: "Arbitrum", token: "USDT", tint: "#28A0F0", icon: "T", network: "Arbitrum One", logo: "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xdAC17F958D2ee523a2206206994597C13D831ec7/logo.png" },
  { key: "crypto:ARBITRUM:cbBTC", id: "ARBITRUM", name: "Arbitrum", token: "cbBTC", tint: "#28A0F0", icon: "₿", network: "Arbitrum One", logo: "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/base/assets/0xcbB7C0000aB88B473b1f5aFd9ef808440eed33Bf/logo.png" },
  { key: "crypto:OPTIMISM:ETH", id: "OPTIMISM", name: "Optimism", token: "ETH", tint: "#FF0420", icon: "Ξ", network: "Optimism", logo: "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/optimism/info/logo.png" },
  { key: "crypto:OPTIMISM:USDC", id: "OPTIMISM", name: "Optimism", token: "USDC", tint: "#FF0420", icon: "$", network: "Optimism", logo: "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48/logo.png" },
  { key: "crypto:OPTIMISM:USDT", id: "OPTIMISM", name: "Optimism", token: "USDT", tint: "#FF0420", icon: "T", network: "Optimism", logo: "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xdAC17F958D2ee523a2206206994597C13D831ec7/logo.png" },
  { key: "crypto:POLYGON:POL", id: "POLYGON", name: "Polygon", token: "POL", tint: "#7B3FE4", icon: "P", network: "Polygon", logo: "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/polygon/info/logo.png" },
  { key: "crypto:POLYGON:USDC", id: "POLYGON", name: "Polygon", token: "USDC", tint: "#7B3FE4", icon: "$", network: "Polygon", logo: "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48/logo.png" },
  { key: "crypto:POLYGON:USDT", id: "POLYGON", name: "Polygon", token: "USDT", tint: "#7B3FE4", icon: "T", network: "Polygon", logo: "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xdAC17F958D2ee523a2206206994597C13D831ec7/logo.png" },
  { key: "crypto:BSC:BNB", id: "BSC", name: "BNB Chain", token: "BNB", tint: "#F0B90B", icon: "B", network: "BNB Smart Chain", logo: "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/binance/info/logo.png" },
  { key: "crypto:BSC:USDT", id: "BSC", name: "BNB Chain", token: "USDT", tint: "#F0B90B", icon: "T", network: "BNB Smart Chain", logo: "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xdAC17F958D2ee523a2206206994597C13D831ec7/logo.png" },
  { key: "crypto:BSC:USDC", id: "BSC", name: "BNB Chain", token: "USDC", tint: "#F0B90B", icon: "$", network: "BNB Smart Chain", logo: "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48/logo.png" },
  { key: "crypto:AVALANCHE:AVAX", id: "AVALANCHE", name: "Avalanche", token: "AVAX", tint: "#E84142", icon: "A", network: "Avalanche C-Chain", logo: "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/avalanchex/info/logo.png" },
  { key: "crypto:AVALANCHE:USDC", id: "AVALANCHE", name: "Avalanche", token: "USDC", tint: "#E84142", icon: "$", network: "Avalanche C-Chain", logo: "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48/logo.png" },
  { key: "crypto:AVALANCHE:USDT", id: "AVALANCHE", name: "Avalanche", token: "USDT", tint: "#E84142", icon: "T", network: "Avalanche C-Chain", logo: "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xdAC17F958D2ee523a2206206994597C13D831ec7/logo.png" },
  { key: "crypto:GNOSIS:USDC", id: "GNOSIS", name: "Gnosis", token: "USDC", tint: "#04795B", icon: "$", network: "Gnosis Chain", logo: "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48/logo.png" },
  { key: "crypto:GNOSIS:EURe", id: "GNOSIS", name: "Gnosis", token: "EURe", tint: "#04795B", icon: "€", network: "Gnosis Chain", logo: "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/xdai/info/logo.png" },
  { key: "crypto:SCROLL:USDC", id: "SCROLL", name: "Scroll", token: "USDC", tint: "#D9A26C", icon: "$", network: "Scroll", logo: "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48/logo.png" },
  { key: "crypto:SCROLL:USDT", id: "SCROLL", name: "Scroll", token: "USDT", tint: "#D9A26C", icon: "T", network: "Scroll", logo: "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xdAC17F958D2ee523a2206206994597C13D831ec7/logo.png" },
  { key: "crypto:ALEO:ALEO", id: "ALEO", name: "Aleo", token: "ALEO", tint: "#111111", icon: "A", network: "Aleo", logo: "https://monad.xyz/favicon.ico" },
  { key: "crypto:XLAYER:USDT", id: "XLAYER", name: "X Layer", token: "USDT", tint: "#1E1E1E", icon: "T", network: "X Layer", logo: "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xdAC17F958D2ee523a2206206994597C13D831ec7/logo.png" },
  { key: "crypto:BERA:BERA", id: "BERA", name: "Berachain", token: "BERA", tint: "#814625", icon: "B", network: "Berachain", logo: "https://assets.coingecko.com/coins/images/31034/standard/bera.png" },
  { key: "crypto:SOLANA:SOL", id: "SOLANA", name: "Solana", token: "SOL", tint: "#14F195", icon: "S", network: "Solana", logo: "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/solana/info/logo.png" },
  { key: "crypto:SOLANA:USDC", id: "SOLANA", name: "Solana", token: "USDC", tint: "#14F195", icon: "$", network: "Solana", logo: "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48/logo.png" },
  { key: "crypto:SOLANA:WIF", id: "SOLANA", name: "Solana", token: "WIF", tint: "#14F195", icon: "W", network: "Solana", logo: "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/solana/assets/EKpQGSJtjMFqKZ9KQanAtY7YXDeJs2H3ob77S2SpxmX/logo.png" },
  { key: "crypto:TRON:TRX", id: "TRON", name: "Tron", token: "TRX", tint: "#EF0027", icon: "T", network: "Tron", logo: "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/tron/info/logo.png" },
  { key: "crypto:TRON:USDT", id: "TRON", name: "Tron", token: "USDT", tint: "#EF0027", icon: "T", network: "Tron", logo: "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xdAC17F958D2ee523a2206206994597C13D831ec7/logo.png" },
  { key: "crypto:NEAR:NEAR", id: "NEAR", name: "NEAR", token: "NEAR", tint: "#111111", icon: "N", network: "NEAR", logo: "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/near/info/logo.png" },
  { key: "crypto:NEAR:USDC", id: "NEAR", name: "NEAR", token: "USDC", tint: "#111111", icon: "$", network: "NEAR", logo: "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48/logo.png" },
  { key: "crypto:TON:TON", id: "TON", name: "TON", token: "TON", tint: "#0098EA", icon: "T", network: "TON", logo: "https://assets.coingecko.com/coins/images/17980/standard/ton_symbol.png" },
  { key: "crypto:TON:USDT", id: "TON", name: "TON", token: "USDT", tint: "#0098EA", icon: "T", network: "TON", logo: "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xdAC17F958D2ee523a2206206994597C13D831ec7/logo.png" },
  { key: "crypto:SUI:SUI", id: "SUI", name: "Sui", token: "SUI", tint: "#4DA2FF", icon: "S", network: "Sui", logo: "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/sui/info/logo.png" },
  { key: "crypto:SUI:USDC", id: "SUI", name: "Sui", token: "USDC", tint: "#4DA2FF", icon: "$", network: "Sui", logo: "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48/logo.png" },
  { key: "crypto:APTOS:APT", id: "APTOS", name: "Aptos", token: "APT", tint: "#111111", icon: "A", network: "Aptos", logo: "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/aptos/info/logo.png" },
  { key: "crypto:APTOS:USDC", id: "APTOS", name: "Aptos", token: "USDC", tint: "#111111", icon: "$", network: "Aptos", logo: "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48/logo.png" },
  { key: "crypto:APTOS:USDT", id: "APTOS", name: "Aptos", token: "USDT", tint: "#111111", icon: "T", network: "Aptos", logo: "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xdAC17F958D2ee523a2206206994597C13D831ec7/logo.png" },
  { id: "STARKNET", name: "Starknet", token: "STRK", tint: "#EC796B", icon: "S", network: "Starknet", logo: "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/starknet/info/logo.png", key: "crypto:STARKNET:STRK" },
  { key: "crypto:BITCOIN:BTC", id: "BITCOIN", name: "Bitcoin", token: "BTC", tint: "#F7931A", icon: "₿", network: "Bitcoin", logo: "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/bitcoin/info/logo.png" },
  { key: "crypto:XRP:XRP", id: "XRP", name: "XRP Ledger", token: "XRP", tint: "#23292F", icon: "X", network: "XRP Ledger", logo: "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ripple/info/logo.png" },
  { key: "crypto:STELLAR:XLM", id: "STELLAR", name: "Stellar", token: "XLM", tint: "#111111", icon: "★", network: "Stellar", logo: "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/stellar/info/logo.png" },
  { key: "crypto:STELLAR:USDC", id: "STELLAR", name: "Stellar", token: "USDC", tint: "#111111", icon: "$", network: "Stellar", logo: "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48/logo.png" },
  { id: "CARDANO", name: "Cardano", token: "ADA", tint: "#0033AD", icon: "₳", network: "Cardano", logo: "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/cardano/info/logo.png", key: "crypto:CARDANO:ADA" },
  { id: "DOGE", name: "Dogecoin", token: "DOGE", tint: "#C2A633", icon: "D", network: "Dogecoin", logo: "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/doge/info/logo.png", key: "crypto:DOGE:DOGE" },
  { id: "LITECOIN", name: "Litecoin", token: "LTC", tint: "#345D9D", icon: "L", network: "Litecoin", logo: "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/litecoin/info/logo.png", key: "crypto:LITECOIN:LTC" },
  { id: "BCH", name: "Bitcoin Cash", token: "BCH", tint: "#8DC351", icon: "B", network: "Bitcoin Cash", logo: "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/bitcoincash/info/logo.png", key: "crypto:BCH:BCH" },
  { id: "ZEC", name: "Zcash", token: "ZEC", tint: "#F4B728", icon: "Z", network: "Zcash", logo: "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/zcash/info/logo.png", key: "crypto:ZEC:ZEC" },
  { id: "DASH", name: "Dash", token: "DASH", tint: "#008CE7", icon: "D", network: "Dash", logo: "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/dash/info/logo.png", key: "crypto:DASH:DASH" }
];
var gn = Object.defineProperty, it = Object.getOwnPropertySymbols, Ut = Object.prototype.hasOwnProperty, _t = Object.prototype.propertyIsEnumerable, It = (a, o, d) => o in a ? gn(a, o, { enumerable: !0, configurable: !0, writable: !0, value: d }) : a[o] = d, kt = (a, o) => {
  for (var d in o || (o = {}))
    Ut.call(o, d) && It(a, d, o[d]);
  if (it)
    for (var d of it(o))
      _t.call(o, d) && It(a, d, o[d]);
  return a;
}, wt = (a, o) => {
  var d = {};
  for (var h in a)
    Ut.call(a, h) && o.indexOf(h) < 0 && (d[h] = a[h]);
  if (a != null && it)
    for (var h of it(a))
      o.indexOf(h) < 0 && _t.call(a, h) && (d[h] = a[h]);
  return d;
};
/**
 * @license QR Code generator library (TypeScript)
 * Copyright (c) Project Nayuki.
 * SPDX-License-Identifier: MIT
 */
var Ne;
((a) => {
  const o = class B {
    /*-- Constructor (low level) and fields --*/
    // Creates a new QR Code with the given version number,
    // error correction level, data codeword bytes, and mask number.
    // This is a low-level API that most users should not use directly.
    // A mid-level API is the encodeSegments() function.
    constructor(t, n, s, c) {
      if (this.version = t, this.errorCorrectionLevel = n, this.modules = [], this.isFunction = [], t < B.MIN_VERSION || t > B.MAX_VERSION)
        throw new RangeError("Version value out of range");
      if (c < -1 || c > 7)
        throw new RangeError("Mask value out of range");
      this.size = t * 4 + 17;
      let u = [];
      for (let m = 0; m < this.size; m++)
        u.push(!1);
      for (let m = 0; m < this.size; m++)
        this.modules.push(u.slice()), this.isFunction.push(u.slice());
      this.drawFunctionPatterns();
      const y = this.addEccAndInterleave(s);
      if (this.drawCodewords(y), c == -1) {
        let m = 1e9;
        for (let w = 0; w < 8; w++) {
          this.applyMask(w), this.drawFormatBits(w);
          const S = this.getPenaltyScore();
          S < m && (c = w, m = S), this.applyMask(w);
        }
      }
      p(0 <= c && c <= 7), this.mask = c, this.applyMask(c), this.drawFormatBits(c), this.isFunction = [];
    }
    /*-- Static factory functions (high level) --*/
    // Returns a QR Code representing the given Unicode text string at the given error correction level.
    // As a conservative upper bound, this function is guaranteed to succeed for strings that have 738 or fewer
    // Unicode code points (not UTF-16 code units) if the low error correction level is used. The smallest possible
    // QR Code version is automatically chosen for the output. The ECC level of the result may be higher than the
    // ecl argument if it can be done without increasing the version.
    static encodeText(t, n) {
      const s = a.QrSegment.makeSegments(t);
      return B.encodeSegments(s, n);
    }
    // Returns a QR Code representing the given binary data at the given error correction level.
    // This function always encodes using the binary segment mode, not any text mode. The maximum number of
    // bytes allowed is 2953. The smallest possible QR Code version is automatically chosen for the output.
    // The ECC level of the result may be higher than the ecl argument if it can be done without increasing the version.
    static encodeBinary(t, n) {
      const s = a.QrSegment.makeBytes(t);
      return B.encodeSegments([s], n);
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
    static encodeSegments(t, n, s = 1, c = 40, u = -1, y = !0) {
      if (!(B.MIN_VERSION <= s && s <= c && c <= B.MAX_VERSION) || u < -1 || u > 7)
        throw new RangeError("Invalid value");
      let m, w;
      for (m = s; ; m++) {
        const k = B.getNumDataCodewords(m, n) * 8, R = j.getTotalBits(t, m);
        if (R <= k) {
          w = R;
          break;
        }
        if (m >= c)
          throw new RangeError("Data too long");
      }
      for (const k of [B.Ecc.MEDIUM, B.Ecc.QUARTILE, B.Ecc.HIGH])
        y && w <= B.getNumDataCodewords(m, k) * 8 && (n = k);
      let S = [];
      for (const k of t) {
        d(k.mode.modeBits, 4, S), d(k.numChars, k.mode.numCharCountBits(m), S);
        for (const R of k.getData())
          S.push(R);
      }
      p(S.length == w);
      const E = B.getNumDataCodewords(m, n) * 8;
      p(S.length <= E), d(0, Math.min(4, E - S.length), S), d(0, (8 - S.length % 8) % 8, S), p(S.length % 8 == 0);
      for (let k = 236; S.length < E; k ^= 253)
        d(k, 8, S);
      let x = [];
      for (; x.length * 8 < S.length; )
        x.push(0);
      return S.forEach((k, R) => x[R >>> 3] |= k << 7 - (R & 7)), new B(m, n, x, u);
    }
    /*-- Accessor methods --*/
    // Returns the color of the module (pixel) at the given coordinates, which is false
    // for light or true for dark. The top left corner has the coordinates (x=0, y=0).
    // If the given coordinates are out of bounds, then false (light) is returned.
    getModule(t, n) {
      return 0 <= t && t < this.size && 0 <= n && n < this.size && this.modules[n][t];
    }
    // Modified to expose modules for easy access
    getModules() {
      return this.modules;
    }
    /*-- Private helper methods for constructor: Drawing function modules --*/
    // Reads this object's version field, and draws and marks all function modules.
    drawFunctionPatterns() {
      for (let s = 0; s < this.size; s++)
        this.setFunctionModule(6, s, s % 2 == 0), this.setFunctionModule(s, 6, s % 2 == 0);
      this.drawFinderPattern(3, 3), this.drawFinderPattern(this.size - 4, 3), this.drawFinderPattern(3, this.size - 4);
      const t = this.getAlignmentPatternPositions(), n = t.length;
      for (let s = 0; s < n; s++)
        for (let c = 0; c < n; c++)
          s == 0 && c == 0 || s == 0 && c == n - 1 || s == n - 1 && c == 0 || this.drawAlignmentPattern(t[s], t[c]);
      this.drawFormatBits(0), this.drawVersion();
    }
    // Draws two copies of the format bits (with its own error correction code)
    // based on the given mask and this object's error correction level field.
    drawFormatBits(t) {
      const n = this.errorCorrectionLevel.formatBits << 3 | t;
      let s = n;
      for (let u = 0; u < 10; u++)
        s = s << 1 ^ (s >>> 9) * 1335;
      const c = (n << 10 | s) ^ 21522;
      p(c >>> 15 == 0);
      for (let u = 0; u <= 5; u++)
        this.setFunctionModule(8, u, h(c, u));
      this.setFunctionModule(8, 7, h(c, 6)), this.setFunctionModule(8, 8, h(c, 7)), this.setFunctionModule(7, 8, h(c, 8));
      for (let u = 9; u < 15; u++)
        this.setFunctionModule(14 - u, 8, h(c, u));
      for (let u = 0; u < 8; u++)
        this.setFunctionModule(this.size - 1 - u, 8, h(c, u));
      for (let u = 8; u < 15; u++)
        this.setFunctionModule(8, this.size - 15 + u, h(c, u));
      this.setFunctionModule(8, this.size - 8, !0);
    }
    // Draws two copies of the version bits (with its own error correction code),
    // based on this object's version field, iff 7 <= version <= 40.
    drawVersion() {
      if (this.version < 7)
        return;
      let t = this.version;
      for (let s = 0; s < 12; s++)
        t = t << 1 ^ (t >>> 11) * 7973;
      const n = this.version << 12 | t;
      p(n >>> 18 == 0);
      for (let s = 0; s < 18; s++) {
        const c = h(n, s), u = this.size - 11 + s % 3, y = Math.floor(s / 3);
        this.setFunctionModule(u, y, c), this.setFunctionModule(y, u, c);
      }
    }
    // Draws a 9*9 finder pattern including the border separator,
    // with the center module at (x, y). Modules can be out of bounds.
    drawFinderPattern(t, n) {
      for (let s = -4; s <= 4; s++)
        for (let c = -4; c <= 4; c++) {
          const u = Math.max(Math.abs(c), Math.abs(s)), y = t + c, m = n + s;
          0 <= y && y < this.size && 0 <= m && m < this.size && this.setFunctionModule(y, m, u != 2 && u != 4);
        }
    }
    // Draws a 5*5 alignment pattern, with the center module
    // at (x, y). All modules must be in bounds.
    drawAlignmentPattern(t, n) {
      for (let s = -2; s <= 2; s++)
        for (let c = -2; c <= 2; c++)
          this.setFunctionModule(t + c, n + s, Math.max(Math.abs(c), Math.abs(s)) != 1);
    }
    // Sets the color of a module and marks it as a function module.
    // Only used by the constructor. Coordinates must be in bounds.
    setFunctionModule(t, n, s) {
      this.modules[n][t] = s, this.isFunction[n][t] = !0;
    }
    /*-- Private helper methods for constructor: Codewords and masking --*/
    // Returns a new byte string representing the given data with the appropriate error correction
    // codewords appended to it, based on this object's version and error correction level.
    addEccAndInterleave(t) {
      const n = this.version, s = this.errorCorrectionLevel;
      if (t.length != B.getNumDataCodewords(n, s))
        throw new RangeError("Invalid argument");
      const c = B.NUM_ERROR_CORRECTION_BLOCKS[s.ordinal][n], u = B.ECC_CODEWORDS_PER_BLOCK[s.ordinal][n], y = Math.floor(B.getNumRawDataModules(n) / 8), m = c - y % c, w = Math.floor(y / c);
      let S = [];
      const E = B.reedSolomonComputeDivisor(u);
      for (let k = 0, R = 0; k < c; k++) {
        let O = t.slice(R, R + w - u + (k < m ? 0 : 1));
        R += O.length;
        const V = B.reedSolomonComputeRemainder(O, E);
        k < m && O.push(0), S.push(O.concat(V));
      }
      let x = [];
      for (let k = 0; k < S[0].length; k++)
        S.forEach((R, O) => {
          (k != w - u || O >= m) && x.push(R[k]);
        });
      return p(x.length == y), x;
    }
    // Draws the given sequence of 8-bit codewords (data and error correction) onto the entire
    // data area of this QR Code. Function modules need to be marked off before this is called.
    drawCodewords(t) {
      if (t.length != Math.floor(B.getNumRawDataModules(this.version) / 8))
        throw new RangeError("Invalid argument");
      let n = 0;
      for (let s = this.size - 1; s >= 1; s -= 2) {
        s == 6 && (s = 5);
        for (let c = 0; c < this.size; c++)
          for (let u = 0; u < 2; u++) {
            const y = s - u, w = (s + 1 & 2) == 0 ? this.size - 1 - c : c;
            !this.isFunction[w][y] && n < t.length * 8 && (this.modules[w][y] = h(t[n >>> 3], 7 - (n & 7)), n++);
          }
      }
      p(n == t.length * 8);
    }
    // XORs the codeword modules in this QR Code with the given mask pattern.
    // The function modules must be marked and the codeword bits must be drawn
    // before masking. Due to the arithmetic of XOR, calling applyMask() with
    // the same mask value a second time will undo the mask. A final well-formed
    // QR Code needs exactly one (not zero, two, etc.) mask applied.
    applyMask(t) {
      if (t < 0 || t > 7)
        throw new RangeError("Mask value out of range");
      for (let n = 0; n < this.size; n++)
        for (let s = 0; s < this.size; s++) {
          let c;
          switch (t) {
            case 0:
              c = (s + n) % 2 == 0;
              break;
            case 1:
              c = n % 2 == 0;
              break;
            case 2:
              c = s % 3 == 0;
              break;
            case 3:
              c = (s + n) % 3 == 0;
              break;
            case 4:
              c = (Math.floor(s / 3) + Math.floor(n / 2)) % 2 == 0;
              break;
            case 5:
              c = s * n % 2 + s * n % 3 == 0;
              break;
            case 6:
              c = (s * n % 2 + s * n % 3) % 2 == 0;
              break;
            case 7:
              c = ((s + n) % 2 + s * n % 3) % 2 == 0;
              break;
            default:
              throw new Error("Unreachable");
          }
          !this.isFunction[n][s] && c && (this.modules[n][s] = !this.modules[n][s]);
        }
    }
    // Calculates and returns the penalty score based on state of this QR Code's current modules.
    // This is used by the automatic mask choice algorithm to find the mask pattern that yields the lowest score.
    getPenaltyScore() {
      let t = 0;
      for (let u = 0; u < this.size; u++) {
        let y = !1, m = 0, w = [0, 0, 0, 0, 0, 0, 0];
        for (let S = 0; S < this.size; S++)
          this.modules[u][S] == y ? (m++, m == 5 ? t += B.PENALTY_N1 : m > 5 && t++) : (this.finderPenaltyAddHistory(m, w), y || (t += this.finderPenaltyCountPatterns(w) * B.PENALTY_N3), y = this.modules[u][S], m = 1);
        t += this.finderPenaltyTerminateAndCount(y, m, w) * B.PENALTY_N3;
      }
      for (let u = 0; u < this.size; u++) {
        let y = !1, m = 0, w = [0, 0, 0, 0, 0, 0, 0];
        for (let S = 0; S < this.size; S++)
          this.modules[S][u] == y ? (m++, m == 5 ? t += B.PENALTY_N1 : m > 5 && t++) : (this.finderPenaltyAddHistory(m, w), y || (t += this.finderPenaltyCountPatterns(w) * B.PENALTY_N3), y = this.modules[S][u], m = 1);
        t += this.finderPenaltyTerminateAndCount(y, m, w) * B.PENALTY_N3;
      }
      for (let u = 0; u < this.size - 1; u++)
        for (let y = 0; y < this.size - 1; y++) {
          const m = this.modules[u][y];
          m == this.modules[u][y + 1] && m == this.modules[u + 1][y] && m == this.modules[u + 1][y + 1] && (t += B.PENALTY_N2);
        }
      let n = 0;
      for (const u of this.modules)
        n = u.reduce((y, m) => y + (m ? 1 : 0), n);
      const s = this.size * this.size, c = Math.ceil(Math.abs(n * 20 - s * 10) / s) - 1;
      return p(0 <= c && c <= 9), t += c * B.PENALTY_N4, p(0 <= t && t <= 2568888), t;
    }
    /*-- Private helper functions --*/
    // Returns an ascending list of positions of alignment patterns for this version number.
    // Each position is in the range [0,177), and are used on both the x and y axes.
    // This could be implemented as lookup table of 40 variable-length lists of integers.
    getAlignmentPatternPositions() {
      if (this.version == 1)
        return [];
      {
        const t = Math.floor(this.version / 7) + 2, n = this.version == 32 ? 26 : Math.ceil((this.version * 4 + 4) / (t * 2 - 2)) * 2;
        let s = [6];
        for (let c = this.size - 7; s.length < t; c -= n)
          s.splice(1, 0, c);
        return s;
      }
    }
    // Returns the number of data bits that can be stored in a QR Code of the given version number, after
    // all function modules are excluded. This includes remainder bits, so it might not be a multiple of 8.
    // The result is in the range [208, 29648]. This could be implemented as a 40-entry lookup table.
    static getNumRawDataModules(t) {
      if (t < B.MIN_VERSION || t > B.MAX_VERSION)
        throw new RangeError("Version number out of range");
      let n = (16 * t + 128) * t + 64;
      if (t >= 2) {
        const s = Math.floor(t / 7) + 2;
        n -= (25 * s - 10) * s - 55, t >= 7 && (n -= 36);
      }
      return p(208 <= n && n <= 29648), n;
    }
    // Returns the number of 8-bit data (i.e. not error correction) codewords contained in any
    // QR Code of the given version number and error correction level, with remainder bits discarded.
    // This stateless pure function could be implemented as a (40*4)-cell lookup table.
    static getNumDataCodewords(t, n) {
      return Math.floor(B.getNumRawDataModules(t) / 8) - B.ECC_CODEWORDS_PER_BLOCK[n.ordinal][t] * B.NUM_ERROR_CORRECTION_BLOCKS[n.ordinal][t];
    }
    // Returns a Reed-Solomon ECC generator polynomial for the given degree. This could be
    // implemented as a lookup table over all possible parameter values, instead of as an algorithm.
    static reedSolomonComputeDivisor(t) {
      if (t < 1 || t > 255)
        throw new RangeError("Degree out of range");
      let n = [];
      for (let c = 0; c < t - 1; c++)
        n.push(0);
      n.push(1);
      let s = 1;
      for (let c = 0; c < t; c++) {
        for (let u = 0; u < n.length; u++)
          n[u] = B.reedSolomonMultiply(n[u], s), u + 1 < n.length && (n[u] ^= n[u + 1]);
        s = B.reedSolomonMultiply(s, 2);
      }
      return n;
    }
    // Returns the Reed-Solomon error correction codeword for the given data and divisor polynomials.
    static reedSolomonComputeRemainder(t, n) {
      let s = n.map((c) => 0);
      for (const c of t) {
        const u = c ^ s.shift();
        s.push(0), n.forEach((y, m) => s[m] ^= B.reedSolomonMultiply(y, u));
      }
      return s;
    }
    // Returns the product of the two given field elements modulo GF(2^8/0x11D). The arguments and result
    // are unsigned 8-bit integers. This could be implemented as a lookup table of 256*256 entries of uint8.
    static reedSolomonMultiply(t, n) {
      if (t >>> 8 || n >>> 8)
        throw new RangeError("Byte out of range");
      let s = 0;
      for (let c = 7; c >= 0; c--)
        s = s << 1 ^ (s >>> 7) * 285, s ^= (n >>> c & 1) * t;
      return p(s >>> 8 == 0), s;
    }
    // Can only be called immediately after a light run is added, and
    // returns either 0, 1, or 2. A helper function for getPenaltyScore().
    finderPenaltyCountPatterns(t) {
      const n = t[1];
      p(n <= this.size * 3);
      const s = n > 0 && t[2] == n && t[3] == n * 3 && t[4] == n && t[5] == n;
      return (s && t[0] >= n * 4 && t[6] >= n ? 1 : 0) + (s && t[6] >= n * 4 && t[0] >= n ? 1 : 0);
    }
    // Must be called at the end of a line (row or column) of modules. A helper function for getPenaltyScore().
    finderPenaltyTerminateAndCount(t, n, s) {
      return t && (this.finderPenaltyAddHistory(n, s), n = 0), n += this.size, this.finderPenaltyAddHistory(n, s), this.finderPenaltyCountPatterns(s);
    }
    // Pushes the given value to the front and drops the last value. A helper function for getPenaltyScore().
    finderPenaltyAddHistory(t, n) {
      n[0] == 0 && (t += this.size), n.pop(), n.unshift(t);
    }
  };
  o.MIN_VERSION = 1, o.MAX_VERSION = 40, o.PENALTY_N1 = 3, o.PENALTY_N2 = 3, o.PENALTY_N3 = 40, o.PENALTY_N4 = 10, o.ECC_CODEWORDS_PER_BLOCK = [
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
  ], o.NUM_ERROR_CORRECTION_BLOCKS = [
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
  ], a.QrCode = o;
  function d(g, t, n) {
    if (t < 0 || t > 31 || g >>> t)
      throw new RangeError("Value out of range");
    for (let s = t - 1; s >= 0; s--)
      n.push(g >>> s & 1);
  }
  function h(g, t) {
    return (g >>> t & 1) != 0;
  }
  function p(g) {
    if (!g)
      throw new Error("Assertion error");
  }
  const l = class _ {
    /*-- Constructor (low level) and fields --*/
    // Creates a new QR Code segment with the given attributes and data.
    // The character count (numChars) must agree with the mode and the bit buffer length,
    // but the constraint isn't checked. The given bit buffer is cloned and stored.
    constructor(t, n, s) {
      if (this.mode = t, this.numChars = n, this.bitData = s, n < 0)
        throw new RangeError("Invalid argument");
      this.bitData = s.slice();
    }
    /*-- Static factory functions (mid level) --*/
    // Returns a segment representing the given binary data encoded in
    // byte mode. All input byte arrays are acceptable. Any text string
    // can be converted to UTF-8 bytes and encoded as a byte mode segment.
    static makeBytes(t) {
      let n = [];
      for (const s of t)
        d(s, 8, n);
      return new _(_.Mode.BYTE, t.length, n);
    }
    // Returns a segment representing the given string of decimal digits encoded in numeric mode.
    static makeNumeric(t) {
      if (!_.isNumeric(t))
        throw new RangeError("String contains non-numeric characters");
      let n = [];
      for (let s = 0; s < t.length; ) {
        const c = Math.min(t.length - s, 3);
        d(parseInt(t.substring(s, s + c), 10), c * 3 + 1, n), s += c;
      }
      return new _(_.Mode.NUMERIC, t.length, n);
    }
    // Returns a segment representing the given text string encoded in alphanumeric mode.
    // The characters allowed are: 0 to 9, A to Z (uppercase only), space,
    // dollar, percent, asterisk, plus, hyphen, period, slash, colon.
    static makeAlphanumeric(t) {
      if (!_.isAlphanumeric(t))
        throw new RangeError("String contains unencodable characters in alphanumeric mode");
      let n = [], s;
      for (s = 0; s + 2 <= t.length; s += 2) {
        let c = _.ALPHANUMERIC_CHARSET.indexOf(t.charAt(s)) * 45;
        c += _.ALPHANUMERIC_CHARSET.indexOf(t.charAt(s + 1)), d(c, 11, n);
      }
      return s < t.length && d(_.ALPHANUMERIC_CHARSET.indexOf(t.charAt(s)), 6, n), new _(_.Mode.ALPHANUMERIC, t.length, n);
    }
    // Returns a new mutable list of zero or more segments to represent the given Unicode text string.
    // The result may use various segment modes and switch modes to optimize the length of the bit stream.
    static makeSegments(t) {
      return t == "" ? [] : _.isNumeric(t) ? [_.makeNumeric(t)] : _.isAlphanumeric(t) ? [_.makeAlphanumeric(t)] : [_.makeBytes(_.toUtf8ByteArray(t))];
    }
    // Returns a segment representing an Extended Channel Interpretation
    // (ECI) designator with the given assignment value.
    static makeEci(t) {
      let n = [];
      if (t < 0)
        throw new RangeError("ECI assignment value out of range");
      if (t < 128)
        d(t, 8, n);
      else if (t < 16384)
        d(2, 2, n), d(t, 14, n);
      else if (t < 1e6)
        d(6, 3, n), d(t, 21, n);
      else
        throw new RangeError("ECI assignment value out of range");
      return new _(_.Mode.ECI, 0, n);
    }
    // Tests whether the given string can be encoded as a segment in numeric mode.
    // A string is encodable iff each character is in the range 0 to 9.
    static isNumeric(t) {
      return _.NUMERIC_REGEX.test(t);
    }
    // Tests whether the given string can be encoded as a segment in alphanumeric mode.
    // A string is encodable iff each character is in the following set: 0 to 9, A to Z
    // (uppercase only), space, dollar, percent, asterisk, plus, hyphen, period, slash, colon.
    static isAlphanumeric(t) {
      return _.ALPHANUMERIC_REGEX.test(t);
    }
    /*-- Methods --*/
    // Returns a new copy of the data bits of this segment.
    getData() {
      return this.bitData.slice();
    }
    // (Package-private) Calculates and returns the number of bits needed to encode the given segments at
    // the given version. The result is infinity if a segment has too many characters to fit its length field.
    static getTotalBits(t, n) {
      let s = 0;
      for (const c of t) {
        const u = c.mode.numCharCountBits(n);
        if (c.numChars >= 1 << u)
          return 1 / 0;
        s += 4 + u + c.bitData.length;
      }
      return s;
    }
    // Returns a new array of bytes representing the given string encoded in UTF-8.
    static toUtf8ByteArray(t) {
      t = encodeURI(t);
      let n = [];
      for (let s = 0; s < t.length; s++)
        t.charAt(s) != "%" ? n.push(t.charCodeAt(s)) : (n.push(parseInt(t.substring(s + 1, s + 3), 16)), s += 2);
      return n;
    }
  };
  l.NUMERIC_REGEX = /^[0-9]*$/, l.ALPHANUMERIC_REGEX = /^[A-Z0-9 $%*+.\/:-]*$/, l.ALPHANUMERIC_CHARSET = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ $%*+-./:";
  let j = l;
  a.QrSegment = l;
})(Ne || (Ne = {}));
((a) => {
  ((o) => {
    const d = class {
      // The QR Code can tolerate about 30% erroneous codewords
      /*-- Constructor and fields --*/
      constructor(p, l) {
        this.ordinal = p, this.formatBits = l;
      }
    };
    d.LOW = new d(0, 1), d.MEDIUM = new d(1, 0), d.QUARTILE = new d(2, 3), d.HIGH = new d(3, 2), o.Ecc = d;
  })(a.QrCode || (a.QrCode = {}));
})(Ne || (Ne = {}));
((a) => {
  ((o) => {
    const d = class {
      /*-- Constructor and fields --*/
      constructor(p, l) {
        this.modeBits = p, this.numBitsCharCount = l;
      }
      /*-- Method --*/
      // (Package-private) Returns the bit width of the character count field for a segment in
      // this mode in a QR Code at the given version number. The result is in the range [0, 16].
      numCharCountBits(p) {
        return this.numBitsCharCount[Math.floor((p + 7) / 17)];
      }
    };
    d.NUMERIC = new d(1, [10, 12, 14]), d.ALPHANUMERIC = new d(2, [9, 11, 13]), d.BYTE = new d(4, [8, 16, 16]), d.KANJI = new d(8, [8, 10, 12]), d.ECI = new d(7, [0, 0, 0]), o.Mode = d;
  })(a.QrSegment || (a.QrSegment = {}));
})(Ne || (Ne = {}));
var He = Ne;
/**
 * @license qrcode.react
 * Copyright (c) Paul O'Shannessy
 * SPDX-License-Identifier: ISC
 */
var mn = {
  L: He.QrCode.Ecc.LOW,
  M: He.QrCode.Ecc.MEDIUM,
  Q: He.QrCode.Ecc.QUARTILE,
  H: He.QrCode.Ecc.HIGH
}, zt = 128, Wt = "L", $t = "#FFFFFF", Ht = "#000000", Gt = !1, Yt = 1, xn = 4, yn = 0, bn = 0.1;
function Vt(a, o = 0) {
  const d = [];
  return a.forEach(function(h, p) {
    let l = null;
    h.forEach(function(j, g) {
      if (!j && l !== null) {
        d.push(
          `M${l + o} ${p + o}h${g - l}v1H${l + o}z`
        ), l = null;
        return;
      }
      if (g === h.length - 1) {
        if (!j)
          return;
        l === null ? d.push(`M${g + o},${p + o} h1v1H${g + o}z`) : d.push(
          `M${l + o},${p + o} h${g + 1 - l}v1H${l + o}z`
        );
        return;
      }
      j && l === null && (l = g);
    });
  }), d.join("");
}
function Qt(a, o) {
  return a.slice().map((d, h) => h < o.y || h >= o.y + o.h ? d : d.map((p, l) => l < o.x || l >= o.x + o.w ? p : !1));
}
function kn(a, o, d, h) {
  if (h == null)
    return null;
  const p = a.length + d * 2, l = Math.floor(o * bn), j = p / o, g = (h.width || l) * j, t = (h.height || l) * j, n = h.x == null ? a.length / 2 - g / 2 : h.x * j, s = h.y == null ? a.length / 2 - t / 2 : h.y * j, c = h.opacity == null ? 1 : h.opacity;
  let u = null;
  if (h.excavate) {
    let m = Math.floor(n), w = Math.floor(s), S = Math.ceil(g + n - m), E = Math.ceil(t + s - w);
    u = { x: m, y: w, w: S, h: E };
  }
  const y = h.crossOrigin;
  return { x: n, y: s, h: t, w: g, excavation: u, opacity: c, crossOrigin: y };
}
function wn(a, o) {
  return o != null ? Math.max(Math.floor(o), 0) : a ? xn : yn;
}
function Kt({
  value: a,
  level: o,
  minVersion: d,
  includeMargin: h,
  marginSize: p,
  imageSettings: l,
  size: j,
  boostLevel: g
}) {
  let t = G.useMemo(() => {
    const m = (Array.isArray(a) ? a : [a]).reduce((w, S) => (w.push(...He.QrSegment.makeSegments(S)), w), []);
    return He.QrCode.encodeSegments(
      m,
      mn[o],
      d,
      void 0,
      void 0,
      g
    );
  }, [a, o, d, g]);
  const { cells: n, margin: s, numCells: c, calculatedImageSettings: u } = G.useMemo(() => {
    let y = t.getModules();
    const m = wn(h, p), w = y.length + m * 2, S = kn(
      y,
      j,
      m,
      l
    );
    return {
      cells: y,
      margin: m,
      numCells: w,
      calculatedImageSettings: S
    };
  }, [t, j, l, h, p]);
  return {
    qrcode: t,
    margin: s,
    cells: n,
    numCells: c,
    calculatedImageSettings: u
  };
}
var Sn = function() {
  try {
    new Path2D().addPath(new Path2D());
  } catch {
    return !1;
  }
  return !0;
}(), vn = G.forwardRef(
  function(o, d) {
    const h = o, {
      value: p,
      size: l = zt,
      level: j = Wt,
      bgColor: g = $t,
      fgColor: t = Ht,
      includeMargin: n = Gt,
      minVersion: s = Yt,
      boostLevel: c,
      marginSize: u,
      imageSettings: y
    } = h, w = wt(h, [
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
    ]), { style: S } = w, E = wt(w, ["style"]), x = y == null ? void 0 : y.src, k = G.useRef(null), R = G.useRef(null), O = G.useCallback(
      (U) => {
        k.current = U, typeof d == "function" ? d(U) : d && (d.current = U);
      },
      [d]
    ), [V, Q] = G.useState(!1), { margin: Z, cells: J, numCells: he, calculatedImageSettings: X } = Kt({
      value: p,
      level: j,
      minVersion: s,
      boostLevel: c,
      includeMargin: n,
      marginSize: u,
      imageSettings: y,
      size: l
    });
    G.useEffect(() => {
      if (k.current != null) {
        const U = k.current, z = U.getContext("2d");
        if (!z)
          return;
        let ge = J;
        const de = R.current, I = X != null && de !== null && de.complete && de.naturalHeight !== 0 && de.naturalWidth !== 0;
        I && X.excavation != null && (ge = Qt(
          J,
          X.excavation
        ));
        const ne = window.devicePixelRatio || 1;
        U.height = U.width = l * ne;
        const te = l / he * ne;
        z.scale(te, te), z.fillStyle = g, z.fillRect(0, 0, he, he), z.fillStyle = t, Sn ? z.fill(new Path2D(Vt(ge, Z))) : J.forEach(function(ke, we) {
          ke.forEach(function(Ae, me) {
            Ae && z.fillRect(me + Z, we + Z, 1, 1);
          });
        }), X && (z.globalAlpha = X.opacity), I && z.drawImage(
          de,
          X.x + Z,
          X.y + Z,
          X.w,
          X.h
        );
      }
    }), G.useEffect(() => {
      Q(!1);
    }, [x]);
    const se = kt({ height: l, width: l }, S);
    let ee = null;
    return x != null && (ee = /* @__PURE__ */ G.createElement(
      "img",
      {
        src: x,
        key: x,
        style: { display: "none" },
        onLoad: () => {
          Q(!0);
        },
        ref: R,
        crossOrigin: X == null ? void 0 : X.crossOrigin
      }
    )), /* @__PURE__ */ G.createElement(G.Fragment, null, /* @__PURE__ */ G.createElement(
      "canvas",
      kt({
        style: se,
        height: l,
        width: l,
        ref: O,
        role: "img"
      }, E)
    ), ee);
  }
);
vn.displayName = "QRCodeCanvas";
var Xt = G.forwardRef(
  function(o, d) {
    const h = o, {
      value: p,
      size: l = zt,
      level: j = Wt,
      bgColor: g = $t,
      fgColor: t = Ht,
      includeMargin: n = Gt,
      minVersion: s = Yt,
      boostLevel: c,
      title: u,
      marginSize: y,
      imageSettings: m
    } = h, w = wt(h, [
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
    ]), { margin: S, cells: E, numCells: x, calculatedImageSettings: k } = Kt({
      value: p,
      level: j,
      minVersion: s,
      boostLevel: c,
      includeMargin: n,
      marginSize: y,
      imageSettings: m,
      size: l
    });
    let R = E, O = null;
    m != null && k != null && (k.excavation != null && (R = Qt(
      E,
      k.excavation
    )), O = /* @__PURE__ */ G.createElement(
      "image",
      {
        href: m.src,
        height: k.h,
        width: k.w,
        x: k.x + S,
        y: k.y + S,
        preserveAspectRatio: "none",
        opacity: k.opacity,
        crossOrigin: k.crossOrigin
      }
    ));
    const V = Vt(R, S);
    return /* @__PURE__ */ G.createElement(
      "svg",
      kt({
        height: l,
        width: l,
        viewBox: `0 0 ${x} ${x}`,
        ref: d,
        role: "img"
      }, w),
      !!u && /* @__PURE__ */ G.createElement("title", null, u),
      /* @__PURE__ */ G.createElement(
        "path",
        {
          fill: g,
          d: `M0,0 h${x}v${x}H0z`,
          shapeRendering: "crispEdges"
        }
      ),
      /* @__PURE__ */ G.createElement("path", { fill: t, d: V, shapeRendering: "crispEdges" }),
      O
    );
  }
);
Xt.displayName = "QRCodeSVG";
const jn = typeof window < "u" && window.__WEAVE_API_BASE__ || "http://localhost:4000/api/v1";
async function at(a, o, d) {
  const h = {
    "Content-Type": "application/json",
    "x-api-key": o,
    ...d == null ? void 0 : d.headers
  }, p = await fetch(`${jn}${a}`, { ...d, headers: h });
  if (p.status === 204) return null;
  const l = await p.json();
  if (!l.success) throw new Error(l.error ?? "API error");
  return l.data;
}
const tt = (a) => `fiat:${a.toUpperCase()}`, pt = (a, o) => `crypto:${a.toUpperCase()}:${o.toUpperCase()}`;
async function gt(a, o) {
  const d = new URLSearchParams({
    from: o.from,
    to: o.to,
    amount: String(o.amount),
    ...o.amountIn ? { amountIn: o.amountIn } : {}
  });
  return at(`/quotes?${d}`, a);
}
async function mt(a, o) {
  return at("/orders", a, {
    method: "POST",
    body: JSON.stringify(o)
  });
}
async function lt(a, o) {
  return at(`/orders/${o}`, a);
}
async function En(a) {
  return at("/assets", a);
}
const Cn = Xt, st = {
  forest: "#3D6B50",
  tan: "#B8935A",
  ink: "#1C1B17"
}, i = {
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
}, Ce = Pt.reduce((a, o) => {
  const d = o.key.split(":").pop();
  return a[d] = {
    name: o.name,
    symbol: o.symbol,
    flag: o.flag,
    rate: o.rate,
    min: o.min,
    country: o.country,
    psp: "GTBank",
    // default for now
    bank: "GTBank ••7890",
    method: "Bank transfer"
  }, a;
}, {}), nt = [
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
], An = (a, o, d) => {
  const h = Ce[o], l = !!h ? 0 : 4, j = Number.isInteger(a) ? 0 : l, g = Math.pow(10, j), t = j > 0 ? Math.ceil(a * g) / g : Math.ceil(a), n = new Intl.NumberFormat("en-US", {
    minimumFractionDigits: j,
    maximumFractionDigits: j
  }).format(t);
  return `${h.symbol}${n}`;
}, qe = (a, o = 4) => {
  const d = Math.pow(10, o);
  return (Math.ceil(a * d) / d).toLocaleString("en-US", {
    minimumFractionDigits: o,
    maximumFractionDigits: o
  });
}, Rn = async (a, o, d, h) => {
  const p = document.createElement("canvas"), l = p.getContext("2d");
  if (!l) return;
  const j = st[h] || h || "#0F5D4C", g = 800, t = 1100;
  p.width = g, p.height = t, l.fillStyle = "#FDFDFB", l.fillRect(0, 0, g, t), l.strokeStyle = "#E8EAE6", l.lineWidth = 2, l.strokeRect(40, 40, g - 80, t - 80), l.fillStyle = j, l.font = "700 32px Figtree, Inter, sans-serif", l.fillText("Weave", 80, 110), l.fillStyle = "#6B7572", l.font = "500 16px Inter, sans-serif", l.fillText("PAYMENT RECEIPT", g - 240, 105), l.fillStyle = "#E6F0EC";
  const n = 230, s = 36;
  l.beginPath(), l.roundRect(80, 160, n, s, 8), l.fill(), l.fillStyle = j, l.font = "700 12px Inter, sans-serif", l.textAlign = "center", l.fillText("✓ TRANSACTION SUCCESSFUL", 80 + n / 2, 182), l.textAlign = "left", l.fillStyle = "#0B0F0E", l.font = "700 72px Figtree, Inter, sans-serif";
  const c = An(a.amount, a.currency);
  l.fillText(c, 80, 280), l.fillStyle = "#6B7572", l.font = "500 18px Inter, sans-serif", l.fillText("Total amount paid to " + a.name, 80, 315);
  const u = (S, E, x) => {
    l.fillStyle = "#6B7572", l.font = "500 15px Inter, sans-serif", l.fillText(S, 80, x), l.fillStyle = "#0B0F0E", l.font = "600 16px Inter, sans-serif", l.textAlign = "right", l.fillText(E, g - 80, x), l.textAlign = "left", l.strokeStyle = "#E8EAE6", l.lineWidth = 1, l.beginPath(), l.moveTo(80, x + 25), l.lineTo(g - 80, x + 25), l.stroke();
  }, y = new Date((o == null ? void 0 : o.createdAt) || Date.now()).toLocaleDateString("en-US", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
  u("Payment Date", y, 420), u("Transaction Ref", ((o == null ? void 0 : o.id) || "N/A").toUpperCase(), 490), u("Merchant", a.name, 560), u("Payout Destination", d, 630), u("Status", "Completed", 700), l.fillStyle = "#F5F4EF", l.fillRect(80, 800, g - 160, 120), l.fillStyle = "#0B0F0E", l.font = "600 16px Inter, sans-serif", l.fillText("Security Verification", 110, 845), l.fillStyle = "#6B7572", l.font = "400 14px Inter, sans-serif", l.fillText("This transaction was secured with 256-bit encryption by Paycrest.", 110, 875), l.fillText("You can verify this order directly on the Weave Dashboard.", 110, 895), l.textAlign = "center", l.fillStyle = "#0B0F0E", l.font = "700 24px Figtree, Inter, sans-serif", l.fillText("Thank you for using Weave.", g / 2, 1020), l.fillStyle = "#6B7572", l.font = "400 12px Inter, sans-serif", l.fillText("Support: help@weave.com", g / 2, 1050);
  const m = p.toDataURL("image/png"), w = document.createElement("a");
  w.download = `weave-receipt-${((o == null ? void 0 : o.id) || "txn").slice(0, 8)}.png`, w.href = m, w.click();
};
function v({ gap: a = 12, children: o, style: d }) {
  return /* @__PURE__ */ e.jsx("div", { style: { display: "flex", flexDirection: "column", gap: a, ...d }, children: o });
}
function K({
  gap: a = 10,
  align: o = "center",
  justify: d = "flex-start",
  children: h,
  style: p
}) {
  return /* @__PURE__ */ e.jsx("div", { style: { display: "flex", alignItems: o, justifyContent: d, gap: a, ...p }, children: h });
}
function Ge() {
  return /* @__PURE__ */ e.jsx("div", { style: { height: 1, background: i.hair, width: "100%" } });
}
function St({ children: a, tone: o = "neutral" }) {
  const d = {
    neutral: { bg: "#F1F0EB", fg: i.ink2 },
    good: { bg: i.goodSoft, fg: i.good },
    accent: { bg: i.accentSoft, fg: i.accent },
    warn: { bg: i.warnSoft, fg: i.warn }
  }[o];
  return /* @__PURE__ */ e.jsx("span", { style: {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    height: 22,
    padding: "0 9px",
    borderRadius: 999,
    background: d.bg,
    color: d.fg,
    fontSize: 11.5,
    fontWeight: 500,
    letterSpacing: 0.1
  }, children: a });
}
function Le({ bg: a, children: o, size: d = 32 }) {
  return /* @__PURE__ */ e.jsx("div", { style: {
    width: d,
    height: d,
    borderRadius: d / 2,
    background: a,
    color: "#fff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 700,
    fontSize: d * 0.42,
    flexShrink: 0,
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace"
  }, children: o });
}
function vt({ size: a = 22 }) {
  return /* @__PURE__ */ e.jsxs("svg", { width: a, height: a, viewBox: "0 0 24 24", fill: "none", "aria-hidden": !0, children: [
    /* @__PURE__ */ e.jsx("path", { d: "M3 5 L8 19 L12 9 L16 19 L21 5", stroke: i.accent, strokeWidth: "2.2", strokeLinecap: "round", strokeLinejoin: "round" }),
    /* @__PURE__ */ e.jsx("path", { d: "M5 9 L12 19 L19 9", stroke: i.ink, strokeWidth: "1.2", strokeLinecap: "round", strokeLinejoin: "round", opacity: "0.3" })
  ] });
}
const qt = {
  width: 28,
  height: 28,
  borderRadius: 14,
  border: "none",
  cursor: "pointer",
  background: "transparent",
  color: i.mute,
  display: "flex",
  alignItems: "center",
  justifyContent: "center"
}, Tn = { ...qt, color: i.ink };
function Bn({
  merchantName: a,
  onClose: o,
  showBack: d,
  onBack: h
}) {
  return /* @__PURE__ */ e.jsxs("div", { style: {
    padding: "16px 20px 14px",
    display: "flex",
    alignItems: "center",
    gap: 10,
    borderBottom: `1px solid ${i.hair}`
  }, children: [
    d ? /* @__PURE__ */ e.jsx("button", { onClick: h, style: Tn, children: /* @__PURE__ */ e.jsx("svg", { width: "14", height: "14", viewBox: "0 0 24 24", fill: "none", children: /* @__PURE__ */ e.jsx("path", { d: "M15 18L9 12L15 6", stroke: "currentColor", strokeWidth: "2.2", strokeLinecap: "round", strokeLinejoin: "round" }) }) }) : /* @__PURE__ */ e.jsxs("div", { style: { display: "flex", alignItems: "center", gap: 8 }, children: [
      /* @__PURE__ */ e.jsx(vt, { size: 22 }),
      /* @__PURE__ */ e.jsx("span", { style: { fontWeight: 600, fontSize: 15, letterSpacing: -0.2 }, children: "Weave" })
    ] }),
    /* @__PURE__ */ e.jsxs("div", { style: { flex: 1, textAlign: "center", fontSize: 12.5, color: i.mute }, children: [
      "Paying ",
      /* @__PURE__ */ e.jsx("span", { style: { color: i.ink, fontWeight: 500 }, children: a })
    ] }),
    /* @__PURE__ */ e.jsx("button", { onClick: o, style: qt, children: /* @__PURE__ */ e.jsx("svg", { width: "14", height: "14", viewBox: "0 0 24 24", fill: "none", children: /* @__PURE__ */ e.jsx("path", { d: "M6 6L18 18M6 18L18 6", stroke: "currentColor", strokeWidth: "2.2", strokeLinecap: "round" }) }) })
  ] });
}
function Fn() {
  return /* @__PURE__ */ e.jsxs("div", { style: {
    padding: "12px 20px 14px",
    borderTop: `1px solid ${i.hair}`,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    fontSize: 11,
    color: i.mute,
    background: i.panel,
    borderRadius: "0 0 16px 16px"
  }, children: [
    /* @__PURE__ */ e.jsxs("div", { style: { display: "flex", alignItems: "center", gap: 6 }, children: [
      /* @__PURE__ */ e.jsx("svg", { width: "11", height: "11", viewBox: "0 0 24 24", fill: "none", children: /* @__PURE__ */ e.jsx("path", { d: "M12 2L3 6V12C3 17 6.5 21 12 22C17.5 21 21 17 21 12V6L12 2Z", stroke: "currentColor", strokeWidth: "1.8" }) }),
      "Secured by Weave by Dewdrop Labs"
    ] }),
    /* @__PURE__ */ e.jsx("div", { style: { display: "flex", alignItems: "center", gap: 10 }, children: /* @__PURE__ */ e.jsx("span", { children: "v1.0.0" }) })
  ] });
}
const Lt = {
  width: "100%",
  padding: "12px 14px",
  borderRadius: 12,
  border: `1px solid ${i.hair}`,
  background: "#fff",
  cursor: "pointer",
  fontFamily: "inherit",
  display: "flex",
  alignItems: "center",
  gap: 12,
  transition: "border-color 0.15s, background 0.15s, transform 0.1s"
}, xt = {
  padding: "10px 12px",
  borderRadius: 10,
  border: `1px solid ${i.hair}`,
  background: "#fff",
  cursor: "pointer",
  fontFamily: "inherit",
  display: "flex",
  alignItems: "center",
  gap: 8,
  transition: "border-color 0.15s, background 0.15s"
}, Ye = {
  width: "100%",
  height: 46,
  borderRadius: 10,
  border: "none",
  background: i.ink,
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
}, Zt = {
  width: "100%",
  height: 46,
  borderRadius: 10,
  border: `1px solid ${i.hair}`,
  background: "#fff",
  color: i.ink,
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
function In({ onPick: a, merchant: o, currencies: d, fmtCur: h }) {
  const p = d[o.currency] || Ce[o.currency], [l, j] = L(!1);
  return /* @__PURE__ */ e.jsxs(v, { gap: 16, style: { padding: "22px 20px 6px" }, children: [
    /* @__PURE__ */ e.jsxs(v, { gap: 10, style: { alignItems: "center", padding: "4px 0 6px" }, children: [
      /* @__PURE__ */ e.jsx("div", { style: {
        width: 44,
        height: 44,
        borderRadius: 10,
        background: st[o.currency === "USDC" ? "ink" : "forest"] || "#2B1810",
        color: "#FFFFFF",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontWeight: 700,
        fontSize: 18,
        fontFamily: "var(--weave-font-display, Georgia, serif)",
        boxShadow: "0 2px 8px rgba(0,0,0,0.12)"
      }, children: (() => {
        var t;
        const g = o.name.trim().split(/\s+/).filter(Boolean);
        return g.length >= 2 ? (g[0][0] + g[1][0]).toUpperCase() : ((t = g[0]) == null ? void 0 : t.slice(0, 2).toUpperCase()) ?? "?";
      })() }),
      /* @__PURE__ */ e.jsxs(v, { gap: 3, style: { alignItems: "center" }, children: [
        /* @__PURE__ */ e.jsxs("div", { style: { fontSize: 12.5, color: i.mute }, children: [
          "Pay ",
          o.name
        ] }),
        /* @__PURE__ */ e.jsx("div", { style: { fontSize: 30, fontWeight: 600, letterSpacing: -0.6, color: i.ink }, children: h(o.amount, o.currency) }),
        /* @__PURE__ */ e.jsx("div", { style: { fontSize: 11.5, color: i.mute }, children: o.description || "Secure checkout" })
      ] })
    ] }),
    /* @__PURE__ */ e.jsxs(v, { gap: 8, children: [
      /* @__PURE__ */ e.jsx("div", { style: { fontSize: 11, color: i.mute, textTransform: "uppercase", letterSpacing: 0.6 }, children: "How would you like to pay?" }),
      /* @__PURE__ */ e.jsxs("button", { onClick: () => a("fiat"), style: Lt, children: [
        /* @__PURE__ */ e.jsx("div", { style: { width: 40, height: 40, borderRadius: 10, background: "#fff", border: `1px solid ${i.hair}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }, children: /* @__PURE__ */ e.jsx("svg", { width: "20", height: "20", viewBox: "0 0 24 24", fill: "none", children: /* @__PURE__ */ e.jsx("path", { d: "M3 21H21M5 21V10M9 21V10M15 21V10M19 21V10M2 10L12 3L22 10H2Z", stroke: i.ink, strokeWidth: "1.7", strokeLinecap: "round", strokeLinejoin: "round" }) }) }),
        /* @__PURE__ */ e.jsxs(v, { gap: 2, style: { flex: 1, textAlign: "left", minWidth: 0 }, children: [
          /* @__PURE__ */ e.jsx("div", { style: { fontSize: 14, fontWeight: 500, color: i.ink }, children: "Bank transfer" }),
          /* @__PURE__ */ e.jsxs("div", { style: { fontSize: 11.5, color: i.mute }, children: [
            "Pay in ",
            (p == null ? void 0 : p.name) ?? o.currency,
            " · Instant · No fees"
          ] })
        ] }),
        /* @__PURE__ */ e.jsx("svg", { width: "14", height: "14", viewBox: "0 0 24 24", fill: "none", style: { marginLeft: 4, flexShrink: 0 }, children: /* @__PURE__ */ e.jsx("path", { d: "M9 6L15 12L9 18", stroke: i.mute, strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round" }) })
      ] }),
      /* @__PURE__ */ e.jsxs("button", { onClick: () => a("deposit"), style: Lt, children: [
        /* @__PURE__ */ e.jsx("div", { style: { width: 40, height: 40, borderRadius: 10, background: "#fff", border: `1px solid ${i.hair}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }, children: /* @__PURE__ */ e.jsx(Le, { bg: "#F6851B", size: 24, children: "🦊" }) }),
        /* @__PURE__ */ e.jsxs(v, { gap: 2, style: { flex: 1, textAlign: "left", minWidth: 0 }, children: [
          /* @__PURE__ */ e.jsx("div", { style: { fontSize: 14, fontWeight: 500 }, children: "Pay with crypto wallet" }),
          /* @__PURE__ */ e.jsx("div", { style: { fontSize: 11.5, color: i.mute }, children: "MetaMask detected · Any chain, any token" })
        ] }),
        /* @__PURE__ */ e.jsx("svg", { width: "14", height: "14", viewBox: "0 0 24 24", fill: "none", style: { marginLeft: 4, flexShrink: 0 }, children: /* @__PURE__ */ e.jsx("path", { d: "M9 6L15 12L9 18", stroke: i.mute, strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round" }) })
      ] }),
      l ? /* @__PURE__ */ e.jsxs(v, { gap: 6, style: { padding: "2px 0" }, children: [
        /* @__PURE__ */ e.jsxs(K, { gap: 6, children: [
          /* @__PURE__ */ e.jsxs("button", { onClick: () => a("deposit"), style: { ...xt, flex: 1 }, children: [
            /* @__PURE__ */ e.jsx(Le, { bg: "#3B99FC", size: 20, children: "W" }),
            /* @__PURE__ */ e.jsx("span", { style: { fontSize: 12.5, fontWeight: 500 }, children: "WalletConnect" })
          ] }),
          /* @__PURE__ */ e.jsxs("button", { onClick: () => a("deposit"), style: { ...xt, flex: 1 }, children: [
            /* @__PURE__ */ e.jsx(Le, { bg: "#0052FF", size: 20, children: "B" }),
            /* @__PURE__ */ e.jsx("span", { style: { fontSize: 12.5, fontWeight: 500 }, children: "Coinbase" })
          ] })
        ] }),
        /* @__PURE__ */ e.jsxs("button", { onClick: () => a("deposit"), style: xt, children: [
          /* @__PURE__ */ e.jsx("div", { style: { width: 20, height: 20, borderRadius: 5, background: i.panel, border: `1px solid ${i.hair}`, display: "flex", alignItems: "center", justifyContent: "center" }, children: /* @__PURE__ */ e.jsxs("svg", { width: "10", height: "10", viewBox: "0 0 24 24", fill: "none", children: [
            /* @__PURE__ */ e.jsx("rect", { x: "3", y: "3", width: "7", height: "7", stroke: i.ink, strokeWidth: "2" }),
            /* @__PURE__ */ e.jsx("rect", { x: "14", y: "3", width: "7", height: "7", stroke: i.ink, strokeWidth: "2" }),
            /* @__PURE__ */ e.jsx("rect", { x: "3", y: "14", width: "7", height: "7", stroke: i.ink, strokeWidth: "2" })
          ] }) }),
          /* @__PURE__ */ e.jsx("span", { style: { fontSize: 12.5, fontWeight: 500 }, children: "Pay from mobile / hardware / exchange" }),
          /* @__PURE__ */ e.jsx("svg", { width: "12", height: "12", viewBox: "0 0 24 24", fill: "none", style: { marginLeft: "auto" }, children: /* @__PURE__ */ e.jsx("path", { d: "M9 6L15 12L9 18", stroke: i.mute, strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round" }) })
        ] })
      ] }) : /* @__PURE__ */ e.jsx("button", { onClick: () => j(!0), style: {
        background: "transparent",
        border: "none",
        cursor: "pointer",
        fontFamily: "inherit",
        fontSize: 12,
        color: i.mute,
        padding: "4px 0",
        textAlign: "center"
      }, children: "Use a different wallet ↓" })
    ] })
  ] });
}
function Ln({
  onNext: a,
  merchant: o,
  balances: d,
  selected: h,
  setSelected: p,
  currencies: l
}) {
  var j;
  return /* @__PURE__ */ e.jsxs(v, { gap: 14, style: { padding: "18px 20px 6px" }, children: [
    /* @__PURE__ */ e.jsxs(v, { gap: 4, children: [
      /* @__PURE__ */ e.jsx("div", { style: { fontSize: 18, fontWeight: 600, letterSpacing: -0.3 }, children: "Choose what you'd like to pay with" }),
      /* @__PURE__ */ e.jsxs("div", { style: { fontSize: 12.5, color: i.mute }, children: [
        "We found these balances in your wallet. Pick any — we'll convert to ",
        ((j = l[o.currency]) == null ? void 0 : j.name) ?? o.currency,
        " for ",
        o.name,
        "."
      ] })
    ] }),
    /* @__PURE__ */ e.jsx(v, { gap: 6, children: d.map((g, t) => {
      const n = l[o.currency] || Ce[o.currency], s = g.usd >= o.amount / ((n == null ? void 0 : n.rate) || 1), c = h === t;
      return /* @__PURE__ */ e.jsxs(
        "button",
        {
          onClick: () => s && p(t),
          disabled: !s,
          style: {
            width: "100%",
            padding: "12px 14px",
            background: c ? i.accentSoft : "#fff",
            border: `1.5px solid ${c ? i.accent : i.hair}`,
            borderRadius: 12,
            cursor: s ? "pointer" : "not-allowed",
            opacity: s ? 1 : 0.48,
            display: "flex",
            alignItems: "center",
            gap: 12,
            textAlign: "left",
            fontFamily: "inherit",
            transition: "all 0.15s"
          },
          children: [
            /* @__PURE__ */ e.jsx(Le, { bg: g.chainTint, size: 36, children: g.logo ? /* @__PURE__ */ e.jsx("img", { src: g.logo, style: { width: "100%", height: "100%", borderRadius: "inherit", objectFit: "cover" } }) : g.icon }),
            /* @__PURE__ */ e.jsxs(v, { gap: 2, style: { flex: 1 }, children: [
              /* @__PURE__ */ e.jsxs("div", { style: { fontSize: 14, fontWeight: 500, color: i.ink }, children: [
                qe(g.amount),
                " ",
                g.token
              ] }),
              /* @__PURE__ */ e.jsxs("div", { style: { fontSize: 12, color: i.mute }, children: [
                "on ",
                g.chain,
                " · ≈ $",
                g.usd.toFixed(2)
              ] })
            ] }),
            !s && /* @__PURE__ */ e.jsx(St, { tone: "warn", children: "Too low" }),
            s && c && /* @__PURE__ */ e.jsx("div", { style: { width: 20, height: 20, borderRadius: 10, background: i.accent, display: "flex", alignItems: "center", justifyContent: "center" }, children: /* @__PURE__ */ e.jsx("svg", { width: "12", height: "12", viewBox: "0 0 24 24", fill: "none", children: /* @__PURE__ */ e.jsx("path", { d: "M5 12L10 17L19 7", stroke: "white", strokeWidth: "3", strokeLinecap: "round", strokeLinejoin: "round" }) }) })
          ]
        },
        t
      );
    }) }),
    /* @__PURE__ */ e.jsx("button", { onClick: () => a("quote"), style: { ...Ye, opacity: h === null ? 0.5 : 1 }, disabled: h === null, children: "Continue" })
  ] });
}
function Mn({
  merchant: a,
  balance: o,
  onConfirm: d,
  submitting: h,
  error: p,
  quote: l,
  quoteLoading: j,
  currencies: g,
  fmtCur: t
}) {
  const n = g[a.currency] || Ce[a.currency], s = a.amount / ((n == null ? void 0 : n.rate) || 1), c = l ? l.breakdown.inputAmount : s, u = c / (o.usd / o.amount), y = l ? l.breakdown.bridgeFeeUsd : o.chain === "Base" && o.token === "USDC" ? 0 : 1.8, m = l ? l.breakdown.senderFeeUsd + l.breakdown.appFeeUsd : c * 75e-4, w = y + m, S = l ? l.breakdown.sellRate : (n == null ? void 0 : n.rate) || 1515, E = l ? l.estimatedFiat : a.amount;
  return /* @__PURE__ */ e.jsxs(v, { gap: 14, style: { padding: "16px 20px 6px" }, children: [
    /* @__PURE__ */ e.jsxs(v, { gap: 6, children: [
      /* @__PURE__ */ e.jsx("div", { style: { fontSize: 11, color: i.mute, textTransform: "uppercase", letterSpacing: 0.6 }, children: "You pay" }),
      /* @__PURE__ */ e.jsxs(K, { align: "baseline", gap: 8, children: [
        /* @__PURE__ */ e.jsx("div", { style: { fontSize: 30, fontWeight: 600, letterSpacing: -0.6 }, children: qe(u, 4) }),
        /* @__PURE__ */ e.jsx("div", { style: { fontSize: 16, color: i.ink2, fontWeight: 500 }, children: o.token })
      ] }),
      /* @__PURE__ */ e.jsxs(K, { gap: 6, style: { fontSize: 12, color: i.mute }, children: [
        /* @__PURE__ */ e.jsx(Le, { bg: o.chainTint, size: 14, children: o.icon }),
        "on ",
        o.chain
      ] })
    ] }),
    /* @__PURE__ */ e.jsxs("div", { style: { padding: "2px 0", position: "relative" }, children: [
      /* @__PURE__ */ e.jsx(Ge, {}),
      /* @__PURE__ */ e.jsxs("div", { style: {
        position: "absolute",
        left: "50%",
        top: "50%",
        transform: "translate(-50%, -50%)",
        background: "#fff",
        padding: "0 10px",
        fontSize: 11,
        color: i.mute,
        letterSpacing: 0.4,
        display: "flex",
        alignItems: "center",
        gap: 6
      }, children: [
        /* @__PURE__ */ e.jsx("svg", { width: "11", height: "11", viewBox: "0 0 24 24", fill: "none", children: /* @__PURE__ */ e.jsx("path", { d: "M12 5V19M5 12L12 19L19 12", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round" }) }),
        "converts to"
      ] })
    ] }),
    /* @__PURE__ */ e.jsxs(v, { gap: 6, children: [
      /* @__PURE__ */ e.jsxs("div", { style: { fontSize: 11, color: i.mute, textTransform: "uppercase", letterSpacing: 0.6 }, children: [
        a.name,
        " receives"
      ] }),
      /* @__PURE__ */ e.jsx(K, { align: "baseline", gap: 8, children: /* @__PURE__ */ e.jsx("div", { style: { fontSize: 30, fontWeight: 600, letterSpacing: -0.6, color: i.accent }, children: t(E, a.currency) }) }),
      /* @__PURE__ */ e.jsxs(K, { gap: 6, style: { fontSize: 12, color: i.mute }, children: [
        "via ",
        (n == null ? void 0 : n.method) || "Transfer",
        " · ",
        (n == null ? void 0 : n.psp) || "Partner"
      ] })
    ] }),
    /* @__PURE__ */ e.jsxs(v, { gap: 7, style: { fontSize: 12.5 }, children: [
      /* @__PURE__ */ e.jsxs(K, { justify: "space-between", children: [
        /* @__PURE__ */ e.jsx("span", { style: { color: i.mute }, children: "Rate" }),
        /* @__PURE__ */ e.jsxs("span", { children: [
          "1 USDC = ",
          t(S, a.currency)
        ] })
      ] }),
      y > 0 && /* @__PURE__ */ e.jsxs(K, { justify: "space-between", children: [
        /* @__PURE__ */ e.jsx("span", { style: { color: i.mute }, children: "Network & bridge" }),
        /* @__PURE__ */ e.jsxs("span", { children: [
          "$",
          y.toFixed(2)
        ] })
      ] }),
      /* @__PURE__ */ e.jsxs(K, { justify: "space-between", children: [
        /* @__PURE__ */ e.jsx("span", { style: { color: i.mute }, children: "Weave fee" }),
        /* @__PURE__ */ e.jsxs("span", { children: [
          "$",
          m.toFixed(2)
        ] })
      ] }),
      /* @__PURE__ */ e.jsx(Ge, {}),
      /* @__PURE__ */ e.jsxs(K, { justify: "space-between", style: { fontWeight: 500, color: i.ink }, children: [
        /* @__PURE__ */ e.jsx("span", { children: "Total fees" }),
        /* @__PURE__ */ e.jsxs("span", { children: [
          "$",
          w.toFixed(2)
        ] })
      ] }),
      j && /* @__PURE__ */ e.jsx("div", { style: { fontSize: 11, color: i.mute, textAlign: "center" }, children: "Fetching live rate…" })
    ] }),
    /* @__PURE__ */ e.jsxs(v, { gap: 8, children: [
      p && /* @__PURE__ */ e.jsx("div", { style: {
        background: "#FBEEE9",
        border: `1px solid ${i.err}33`,
        borderRadius: 10,
        padding: "10px 12px",
        fontSize: 12,
        color: i.err,
        lineHeight: 1.5
      }, children: p }),
      /* @__PURE__ */ e.jsxs("button", { onClick: d, disabled: h, style: { ...Ye, opacity: h ? 0.6 : 1, cursor: h ? "not-allowed" : "pointer" }, children: [
        h ? "Creating order…" : "Confirm in wallet",
        !h && /* @__PURE__ */ e.jsx("svg", { width: "14", height: "14", viewBox: "0 0 24 24", fill: "none", children: /* @__PURE__ */ e.jsx("path", { d: "M5 12H19M13 6L19 12L13 18", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round" }) })
      ] }),
      /* @__PURE__ */ e.jsx("div", { style: { fontSize: 11, color: i.mute, textAlign: "center" }, children: "Rate locked for 30s · You'll sign one transaction in your wallet" })
    ] })
  ] });
}
function Dn() {
  return /* @__PURE__ */ e.jsxs("div", { style: { position: "relative", width: 56, height: 56 }, children: [
    /* @__PURE__ */ e.jsxs("svg", { width: "56", height: "56", viewBox: "0 0 56 56", style: { position: "absolute", inset: 0 }, children: [
      /* @__PURE__ */ e.jsx("circle", { cx: "28", cy: "28", r: "24", stroke: i.hair, strokeWidth: "2.5", fill: "none" }),
      /* @__PURE__ */ e.jsx(
        "circle",
        {
          cx: "28",
          cy: "28",
          r: "24",
          stroke: i.accent,
          strokeWidth: "2.5",
          fill: "none",
          strokeDasharray: "40 150",
          strokeLinecap: "round",
          style: { transformOrigin: "center", animation: "wspin 1.2s linear infinite" }
        }
      )
    ] }),
    /* @__PURE__ */ e.jsx("div", { style: { position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }, children: /* @__PURE__ */ e.jsx(vt, { size: 22 }) })
  ] });
}
const On = /* @__PURE__ */ new Set(["completed"]), Nn = /* @__PURE__ */ new Set(["failed", "expired", "refunded"]);
function Mt({
  onNext: a,
  merchant: o,
  mode: d,
  apiKey: h,
  orderId: p,
  bankDetails: l,
  currencies: j,
  fmtCur: g
}) {
  const [t, n] = L(0), [s, c] = L(0), u = ot(!1), y = Ce[o.currency];
  Ee(() => {
    const E = setInterval(() => c((x) => x + 1), 1e3);
    return () => clearInterval(E);
  }, []);
  const m = l != null && l.amountToTransfer ? (() => {
    const E = l.amountToTransfer, x = E.includes(".") ? E.split(".")[1].length : 0;
    return g(Number(E), o.currency, x);
  })() : g(o.amount, o.currency), w = d === "fiat" ? [
    { label: "Confirming your transfer", sub: `Matching the ${m} from your bank`, dur: 1600 },
    { label: "Completing payment", sub: `Sending to ${o.name}`, dur: 2400 }
  ] : [
    { label: "Waiting for deposit", sub: "Detecting your transaction on-chain", dur: 1400 },
    { label: "Confirming your payment", sub: `Settling ${(y == null ? void 0 : y.name) || o.currency} to ${o.name}`, dur: 2600 }
  ];
  Ee(() => {
    if (p) return;
    if (t >= w.length) {
      a("success");
      return;
    }
    const E = setTimeout(() => n((x) => x + 1), w[t].dur);
    return () => clearTimeout(E);
  }, [t, p]), Ee(() => {
    if (!p) return;
    u.current = !1;
    let E;
    const x = async () => {
      if (!u.current) {
        try {
          const k = await lt(h, p), R = String(k.status ?? "").toLowerCase(), O = String(k.paycrestStatus ?? "").toLowerCase();
          if (On.has(R)) {
            u.current = !0, a("success");
            return;
          }
          if (Nn.has(R)) {
            u.current = !0, a("error");
            return;
          }
          O === "fulfilled" && n(1);
        } catch {
        }
        E = setTimeout(x, 5e3);
      }
    };
    return x(), () => {
      u.current = !0, clearTimeout(E);
    };
  }, [p, h]);
  const S = w[Math.min(t, w.length - 1)];
  return /* @__PURE__ */ e.jsxs(v, { gap: 20, style: { padding: "28px 20px 12px", minHeight: 360 }, children: [
    /* @__PURE__ */ e.jsxs(v, { gap: 12, style: { alignItems: "center", paddingTop: 12 }, children: [
      /* @__PURE__ */ e.jsx(Dn, {}),
      /* @__PURE__ */ e.jsxs(v, { gap: 4, style: { alignItems: "center" }, children: [
        /* @__PURE__ */ e.jsx("div", { style: { fontSize: 17, fontWeight: 600, letterSpacing: -0.3 }, children: S.label }),
        /* @__PURE__ */ e.jsx("div", { style: { fontSize: 12.5, color: i.mute, textAlign: "center" }, children: S.sub })
      ] })
    ] }),
    /* @__PURE__ */ e.jsx(v, { gap: 0, style: { padding: "4px 8px" }, children: w.map((E, x) => /* @__PURE__ */ e.jsxs(K, { gap: 12, style: { padding: "10px 0" }, children: [
      /* @__PURE__ */ e.jsxs("div", { style: {
        width: 22,
        height: 22,
        borderRadius: 11,
        flexShrink: 0,
        background: x < t ? i.accent : "#fff",
        border: x < t ? "none" : `1.5px solid ${x === t ? i.accent : i.hair}`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        position: "relative"
      }, children: [
        x < t && /* @__PURE__ */ e.jsx("svg", { width: "12", height: "12", viewBox: "0 0 24 24", fill: "none", children: /* @__PURE__ */ e.jsx("path", { d: "M5 12L10 17L19 7", stroke: "white", strokeWidth: "3", strokeLinecap: "round", strokeLinejoin: "round" }) }),
        x === t && /* @__PURE__ */ e.jsx("div", { style: { width: 8, height: 8, borderRadius: 4, background: i.accent, animation: "wpulse 1.1s ease-in-out infinite" } })
      ] }),
      /* @__PURE__ */ e.jsxs(v, { gap: 1, children: [
        /* @__PURE__ */ e.jsx("div", { style: { fontSize: 13, fontWeight: 500, color: x <= t ? i.ink : i.mute }, children: E.label }),
        /* @__PURE__ */ e.jsx("div", { style: { fontSize: 11.5, color: i.mute }, children: x < t ? "Completed" : x === t ? E.sub : "Pending" })
      ] })
    ] }, x)) }),
    /* @__PURE__ */ e.jsx("div", { style: { fontSize: 11, color: i.mute, textAlign: "center" }, children: "You can safely close this window. We'll email a receipt." })
  ] });
}
function Dt({
  onNext: a,
  merchant: o,
  balance: d,
  direction: h,
  apiKey: p,
  orderId: l,
  accentColor: j,
  currencies: g,
  fmtCur: t
}) {
  var E, x, k, R;
  const [n, s] = L(null);
  Ee(() => {
    if (!l) return;
    let O = !1;
    return lt(p, l).then((V) => {
      O || s(V);
    }).catch(() => {
    }), () => {
      O = !0;
    };
  }, [p, l]);
  const c = typeof (n == null ? void 0 : n.sourceAssetKey) == "string" ? n.sourceAssetKey.split(":").pop() : void 0, u = h === "offramp" && n ? `${qe(Number(n.sourceAmount), 4)} ${c ?? d.token}` : `${qe(d.amount * 0.3, 4)} ${d.token}`, y = (E = n == null ? void 0 : n.destInstrument) == null ? void 0 : E.bankInstitution, m = h === "offramp" ? y ? en(o.currency, y) : ((x = g[o.currency]) == null ? void 0 : x.bank) || ((k = Ce[o.currency]) == null ? void 0 : k.bank) : o.name, w = n != null && n.createdAt && (n != null && n.updatedAt) ? Math.max(1, Math.round((new Date(n.updatedAt).getTime() - new Date(n.createdAt).getTime()) / 1e3)) : null, S = w == null ? "—" : w < 60 ? `${w}s` : `${Math.round(w / 60)}m`;
  return /* @__PURE__ */ e.jsxs(v, { gap: 18, style: { padding: "28px 20px 12px", minHeight: 360 }, children: [
    /* @__PURE__ */ e.jsxs(v, { gap: 14, style: { alignItems: "center", paddingTop: 8 }, children: [
      /* @__PURE__ */ e.jsx("div", { style: {
        width: 64,
        height: 64,
        borderRadius: 32,
        background: i.accent,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        animation: "wpop 0.5s cubic-bezier(0.2, 1.2, 0.4, 1)"
      }, children: /* @__PURE__ */ e.jsx("svg", { width: "32", height: "32", viewBox: "0 0 24 24", fill: "none", children: /* @__PURE__ */ e.jsx("path", { d: "M5 12L10 17L19 7", stroke: "white", strokeWidth: "3.2", strokeLinecap: "round", strokeLinejoin: "round" }) }) }),
      /* @__PURE__ */ e.jsxs(v, { gap: 4, style: { alignItems: "center" }, children: [
        /* @__PURE__ */ e.jsx("div", { style: { fontSize: 20, fontWeight: 600, letterSpacing: -0.3 }, children: "Payment complete" }),
        /* @__PURE__ */ e.jsx("div", { style: { fontSize: 13, color: i.mute, textAlign: "center", lineHeight: 1.5, maxWidth: 280 }, children: h === "offramp" ? /* @__PURE__ */ e.jsxs(e.Fragment, { children: [
          t(o.amount, o.currency),
          " is on its way to ",
          /* @__PURE__ */ e.jsx("span", { style: { color: i.ink }, children: o.name }),
          "."
        ] }) : /* @__PURE__ */ e.jsxs(e.Fragment, { children: [
          "Your payment of ",
          t(o.amount, o.currency),
          " has been sent to ",
          /* @__PURE__ */ e.jsx("span", { style: { color: i.ink }, children: o.name }),
          "."
        ] }) })
      ] })
    ] }),
    /* @__PURE__ */ e.jsxs(v, { gap: 0, style: { background: i.panel, border: `1px solid ${i.hair}`, borderRadius: 12, overflow: "hidden" }, children: [
      /* @__PURE__ */ e.jsxs(K, { justify: "space-between", style: { padding: "12px 14px", fontSize: 12.5 }, children: [
        /* @__PURE__ */ e.jsx("span", { style: { color: i.mute }, children: "Paid with" }),
        h === "offramp" ? /* @__PURE__ */ e.jsxs(K, { gap: 6, children: [
          /* @__PURE__ */ e.jsx(Le, { bg: d.chainTint, size: 16, children: d.icon }),
          /* @__PURE__ */ e.jsx("span", { style: { fontWeight: 500 }, children: u })
        ] }) : /* @__PURE__ */ e.jsxs(K, { gap: 6, children: [
          /* @__PURE__ */ e.jsx("div", { style: { width: 16, height: 16, borderRadius: 8, background: "#fff", border: `1px solid ${i.hair}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10 }, children: ((R = g[o.currency]) == null ? void 0 : R.flag) || "🇳🇬" }),
          /* @__PURE__ */ e.jsx("span", { style: { fontWeight: 500 }, children: t(o.amount, o.currency) })
        ] })
      ] }),
      /* @__PURE__ */ e.jsx(Ge, {}),
      /* @__PURE__ */ e.jsxs(K, { justify: "space-between", style: { padding: "12px 14px", fontSize: 12.5 }, children: [
        /* @__PURE__ */ e.jsx("span", { style: { color: i.mute }, children: h === "offramp" ? "Settled to" : "Paid to" }),
        /* @__PURE__ */ e.jsx("span", { style: { fontWeight: 500 }, children: m })
      ] }),
      /* @__PURE__ */ e.jsx(Ge, {}),
      /* @__PURE__ */ e.jsxs(K, { justify: "space-between", style: { padding: "12px 14px", fontSize: 12.5 }, children: [
        /* @__PURE__ */ e.jsx("span", { style: { color: i.mute }, children: "Completed in" }),
        /* @__PURE__ */ e.jsx(K, { gap: 6, children: /* @__PURE__ */ e.jsx(St, { tone: "good", children: S }) })
      ] })
    ] }),
    /* @__PURE__ */ e.jsxs(v, { gap: 8, children: [
      /* @__PURE__ */ e.jsx("button", { onClick: () => a("connect"), style: Ye, children: "Done" }),
      /* @__PURE__ */ e.jsxs(
        "button",
        {
          onClick: () => Rn(o, n, m, j),
          style: { ...Zt, justifyContent: "center", paddingLeft: 0 },
          children: [
            /* @__PURE__ */ e.jsx("svg", { width: "14", height: "14", viewBox: "0 0 24 24", fill: "none", children: /* @__PURE__ */ e.jsx("path", { d: "M12 3V15M12 15L7 10M12 15L17 10M3 19H21", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round" }) }),
            "Download receipt"
          ]
        }
      )
    ] })
  ] });
}
function Ot({ onNext: a, onBack: o }) {
  return /* @__PURE__ */ e.jsxs(v, { gap: 16, style: { padding: "28px 20px 12px", minHeight: 360 }, children: [
    /* @__PURE__ */ e.jsxs(v, { gap: 14, style: { alignItems: "center", paddingTop: 8 }, children: [
      /* @__PURE__ */ e.jsx("div", { style: { width: 64, height: 64, borderRadius: 32, background: "#FBEEE9", display: "flex", alignItems: "center", justifyContent: "center" }, children: /* @__PURE__ */ e.jsxs("svg", { width: "32", height: "32", viewBox: "0 0 24 24", fill: "none", children: [
        /* @__PURE__ */ e.jsx("path", { d: "M12 8V13M12 17V17.01", stroke: i.err, strokeWidth: "2.4", strokeLinecap: "round" }),
        /* @__PURE__ */ e.jsx("circle", { cx: "12", cy: "12", r: "10", stroke: i.err, strokeWidth: "2" })
      ] }) }),
      /* @__PURE__ */ e.jsxs(v, { gap: 4, style: { alignItems: "center" }, children: [
        /* @__PURE__ */ e.jsx("div", { style: { fontSize: 18, fontWeight: 600 }, children: "Transaction didn't go through" }),
        /* @__PURE__ */ e.jsx("div", { style: { fontSize: 13, color: i.mute, textAlign: "center", maxWidth: 280 }, children: "Your wallet rejected the signature or the rate expired. No funds were moved." })
      ] })
    ] }),
    /* @__PURE__ */ e.jsxs(v, { gap: 8, children: [
      /* @__PURE__ */ e.jsx("button", { onClick: () => o("quote"), style: Ye, children: "Try again" }),
      /* @__PURE__ */ e.jsx("button", { onClick: () => a("connect"), style: Zt, children: "Use a different payment method" })
    ] })
  ] });
}
const Pn = /* @__PURE__ */ new Set(["XRP", "TON", "STELLAR", "NEAR"]), Un = {
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
}, _n = {
  "BASE:USDC": { chainId: 8453, contract: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", decimals: 6 },
  "OPTIMISM:USDC": { chainId: 10, contract: "0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85", decimals: 6 },
  "ARBITRUM:USDC": { chainId: 42161, contract: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831", decimals: 6 },
  "POLYGON:USDC": { chainId: 137, contract: "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359", decimals: 6 }
}, zn = (a, o, d, h) => {
  if (!a) return "";
  if (!o || !d || !h) return a;
  const p = _n[`${d.toUpperCase()}:${h.toUpperCase()}`];
  if (!p) return a;
  const l = Math.ceil(o * 100) / 100, j = BigInt(Math.round(l * 10 ** p.decimals));
  return `ethereum:${p.contract}@${p.chainId}/transfer?address=${a}&uint256=${j.toString()}`;
};
function Wn({
  onNext: a,
  merchant: o,
  depositAddress: d,
  depositMemo: h,
  amountToSend: p,
  sourceToken: l,
  sourceChain: j,
  loading: g,
  error: t,
  onChainChange: n,
  ready: s,
  apiKey: c,
  orderId: u,
  preSelectedChainIdx: y,
  depositChains: m,
  currencies: w,
  fmtCur: S
}) {
  var fe, Me;
  const [E, x] = L(""), [k, R] = L(y ?? null), [O, V] = L(!1), [Q, Z] = L(""), [J, he] = L(""), [X, se] = L(!1), [ee, U] = L(!1), [z, ge] = L(!1), de = Q.trim() ? m.map((C, W) => ({ c: C, i: W })).filter(({ c: C }) => {
    const W = Q.trim().toLowerCase();
    return C.name.toLowerCase().includes(W) || C.token.toLowerCase().includes(W) || C.network.toLowerCase().includes(W) || C.id.toLowerCase().includes(W);
  }) : m.map((C, W) => ({ c: C, i: W })), I = k != null ? m[k] : null, ne = d ?? "", te = h ?? "", ke = l ?? (I == null ? void 0 : I.token) ?? "", we = o.amount / (((fe = w[o.currency]) == null ? void 0 : fe.rate) || ((Me = Ce[o.currency]) == null ? void 0 : Me.rate) || 1), Ae = p ?? we, me = zn(ne, p, j, l), Re = ot(null), ye = I ? Pn.has(I.id) : !1, Te = () => {
    if (!I || !J.trim()) return;
    const C = `${I.id}:${I.token}:${J.trim()}`;
    Re.current !== C && (Re.current = C, se(!0), n(I.id, I.token, J.trim()));
  };
  Ee(() => {
    se(!1), he(""), Re.current = null;
  }, [k]), Ee(() => {
    if (!u) return;
    let C = !1, W;
    const Pe = async () => {
      if (!C) {
        try {
          const ae = await lt(c, u), le = String(ae.status ?? "").toLowerCase(), re = String(ae.nearStatus ?? "").toLowerCase();
          x(re);
          const oe = Array.isArray(ae.steps) && ae.steps.some((De) => (De == null ? void 0 : De.provider) === "nearintents") && re === "processing";
          if (le && le !== "awaiting_deposit" || oe) {
            C = !0, le === "completed" ? a("success") : ["failed", "refunded"].includes(le) ? a("error") : a("processing");
            return;
          }
        } catch {
        }
        W = setTimeout(Pe, 5e3);
      }
    };
    return Pe(), () => {
      C = !0, clearTimeout(W);
    };
  }, [c, u, a]);
  const Se = () => {
    var C;
    ne && ((C = navigator.clipboard) == null || C.writeText(ne), U(!0), setTimeout(() => U(!1), 1500));
  }, Be = () => {
    var C;
    te && ((C = navigator.clipboard) == null || C.writeText(te), ge(!0), setTimeout(() => ge(!1), 1500));
  };
  return O ? /* @__PURE__ */ e.jsxs(v, { gap: 12, style: { padding: "16px 20px 6px" }, children: [
    /* @__PURE__ */ e.jsxs(v, { gap: 8, children: [
      /* @__PURE__ */ e.jsxs(
        "button",
        {
          onClick: () => {
            V(!1), Z("");
          },
          style: {
            alignSelf: "flex-start",
            padding: "4px 0",
            background: "transparent",
            border: "none",
            cursor: "pointer",
            fontSize: 12,
            color: i.mute,
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
      /* @__PURE__ */ e.jsx("div", { style: { fontSize: 12.5, color: i.mute, lineHeight: 1.5 }, children: "We'll generate a deposit address for the network you choose." })
    ] }),
    /* @__PURE__ */ e.jsxs("div", { style: { position: "relative" }, children: [
      /* @__PURE__ */ e.jsxs("svg", { width: "14", height: "14", viewBox: "0 0 24 24", fill: "none", style: {
        position: "absolute",
        left: 12,
        top: "50%",
        transform: "translateY(-50%)",
        pointerEvents: "none"
      }, children: [
        /* @__PURE__ */ e.jsx("circle", { cx: "11", cy: "11", r: "7", stroke: i.mute, strokeWidth: "2" }),
        /* @__PURE__ */ e.jsx("path", { d: "M20 20L16 16", stroke: i.mute, strokeWidth: "2", strokeLinecap: "round" })
      ] }),
      /* @__PURE__ */ e.jsx(
        "input",
        {
          autoFocus: !0,
          placeholder: "Search networks or tokens…",
          value: Q,
          onChange: (C) => Z(C.target.value),
          style: {
            width: "100%",
            boxSizing: "border-box",
            padding: "10px 12px 10px 34px",
            borderRadius: 10,
            border: `1px solid ${i.hair}`,
            background: "#fff",
            fontSize: 13,
            fontFamily: "inherit",
            color: i.ink,
            outline: "none"
          }
        }
      )
    ] }),
    /* @__PURE__ */ e.jsx("div", { style: {
      maxHeight: 360,
      overflowY: "auto",
      border: `1px solid ${i.hair}`,
      borderRadius: 10,
      background: "#fff",
      padding: 4,
      display: "flex",
      flexDirection: "column",
      gap: 1
    }, children: de.length === 0 ? /* @__PURE__ */ e.jsxs("div", { style: { padding: "24px 10px", fontSize: 12, color: i.mute, textAlign: "center" }, children: [
      'No matches for "',
      Q.trim(),
      '"'
    ] }) : de.map(({ c: C, i: W }) => /* @__PURE__ */ e.jsxs("button", { onClick: () => {
      R(W), V(!1), Z("");
    }, style: {
      width: "100%",
      padding: "10px 10px",
      borderRadius: 7,
      background: W === k ? i.accentSoft : "transparent",
      border: "none",
      cursor: "pointer",
      fontFamily: "inherit",
      display: "flex",
      alignItems: "center",
      gap: 10,
      textAlign: "left"
    }, children: [
      /* @__PURE__ */ e.jsx(Le, { bg: C.tint, size: 24, children: C.logo ? /* @__PURE__ */ e.jsx("img", { src: C.logo, style: { width: "100%", height: "100%", borderRadius: "inherit", objectFit: "cover" } }) : C.icon }),
      /* @__PURE__ */ e.jsxs("div", { style: { flex: 1 }, children: [
        /* @__PURE__ */ e.jsxs("div", { style: { fontSize: 13, fontWeight: 500 }, children: [
          C.token,
          " on ",
          C.name
        ] }),
        /* @__PURE__ */ e.jsx("div", { style: { fontSize: 10.5, color: i.mute }, children: C.network })
      ] }),
      W === k && /* @__PURE__ */ e.jsx("svg", { width: "14", height: "14", viewBox: "0 0 24 24", fill: "none", children: /* @__PURE__ */ e.jsx("path", { d: "M5 12L10 17L19 7", stroke: i.accent, strokeWidth: "2.8", strokeLinecap: "round", strokeLinejoin: "round" }) })
    ] }, `${C.id}:${C.token}`)) })
  ] }) : /* @__PURE__ */ e.jsxs(v, { gap: 14, style: { padding: "16px 20px 6px" }, children: [
    /* @__PURE__ */ e.jsxs(v, { gap: 4, children: [
      /* @__PURE__ */ e.jsx("div", { style: { fontSize: 18, fontWeight: 600, letterSpacing: -0.3 }, children: "Send from any wallet" }),
      /* @__PURE__ */ e.jsx("div", { style: { fontSize: 12.5, color: i.mute, lineHeight: 1.5 }, children: "Scan the QR or copy the address. Send from a mobile wallet, exchange, or hardware device — we'll detect the deposit automatically." })
    ] }),
    /* @__PURE__ */ e.jsxs(v, { gap: 6, children: [
      /* @__PURE__ */ e.jsx("div", { style: { fontSize: 11, color: i.mute, textTransform: "uppercase", letterSpacing: 0.6 }, children: "Network" }),
      /* @__PURE__ */ e.jsx("button", { onClick: () => V(!0), style: {
        padding: "10px 12px",
        borderRadius: 10,
        border: `1px solid ${i.hair}`,
        background: "#fff",
        cursor: "pointer",
        fontFamily: "inherit",
        display: "flex",
        alignItems: "center",
        gap: 10,
        textAlign: "left"
      }, children: I ? /* @__PURE__ */ e.jsxs(e.Fragment, { children: [
        /* @__PURE__ */ e.jsx(Le, { bg: I.tint, size: 26, children: I.icon }),
        /* @__PURE__ */ e.jsxs(v, { gap: 1, style: { flex: 1 }, children: [
          /* @__PURE__ */ e.jsxs("div", { style: { fontSize: 13.5, fontWeight: 500 }, children: [
            I.token,
            " on ",
            I.name
          ] }),
          /* @__PURE__ */ e.jsx("div", { style: { fontSize: 11, color: i.mute }, children: I.network })
        ] }),
        /* @__PURE__ */ e.jsx("div", { style: { fontSize: 11, color: i.mute }, children: "Change" })
      ] }) : /* @__PURE__ */ e.jsxs(e.Fragment, { children: [
        /* @__PURE__ */ e.jsx("div", { style: {
          width: 26,
          height: 26,
          borderRadius: 13,
          border: `1px dashed ${i.hair}`,
          background: i.panel,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: i.mute,
          fontSize: 13
        }, children: "?" }),
        /* @__PURE__ */ e.jsxs(v, { gap: 1, style: { flex: 1 }, children: [
          /* @__PURE__ */ e.jsx("div", { style: { fontSize: 13.5, fontWeight: 500, color: i.ink }, children: "Choose a network" }),
          /* @__PURE__ */ e.jsx("div", { style: { fontSize: 11, color: i.mute }, children: "30+ chains supported · powered by NEAR Intents" })
        ] }),
        /* @__PURE__ */ e.jsx("svg", { width: "14", height: "14", viewBox: "0 0 24 24", fill: "none", children: /* @__PURE__ */ e.jsx("path", { d: "M6 9L12 15L18 9", stroke: i.mute, strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round" }) })
      ] }) })
    ] }),
    I ? X ? /* @__PURE__ */ e.jsxs(e.Fragment, { children: [
      /* @__PURE__ */ e.jsxs("div", { style: {
        background: i.panel,
        border: `1px solid ${i.hair}`,
        borderRadius: 12,
        padding: "16px",
        display: "flex",
        gap: 14,
        alignItems: "center"
      }, children: [
        /* @__PURE__ */ e.jsx("div", { style: { padding: 8, background: "#fff", borderRadius: 10, border: `1px solid ${i.hair}`, flexShrink: 0 }, children: me ? /* @__PURE__ */ e.jsx(Cn, { value: me, size: 120, level: "M", includeMargin: !1 }) : /* @__PURE__ */ e.jsxs("div", { style: {
          width: 120,
          height: 120,
          borderRadius: 12,
          background: i.panel,
          border: `1px dashed ${i.hair}`,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 10
        }, children: [
          /* @__PURE__ */ e.jsx("div", { className: "weaving-spinner" }),
          /* @__PURE__ */ e.jsx("div", { style: { fontSize: 10, color: i.mute, letterSpacing: 0.8, fontWeight: 500, textTransform: "uppercase" }, children: "Generating Address" })
        ] }) }),
        /* @__PURE__ */ e.jsxs(v, { gap: 8, style: { flex: 1, minWidth: 0 }, children: [
          /* @__PURE__ */ e.jsxs(v, { gap: 2, children: [
            /* @__PURE__ */ e.jsx("div", { style: { fontSize: 10.5, color: i.mute, textTransform: "uppercase", letterSpacing: 0.6 }, children: "Amount" }),
            /* @__PURE__ */ e.jsx("div", { style: { fontSize: 18, fontWeight: 600, letterSpacing: -0.3 }, children: g ? /* @__PURE__ */ e.jsx("span", { style: { color: i.mute, fontWeight: 400 }, children: "Calculating…" }) : /* @__PURE__ */ e.jsxs(e.Fragment, { children: [
              qe(Ae),
              " ",
              ke
            ] }) }),
            /* @__PURE__ */ e.jsxs("div", { style: { fontSize: 11, color: i.mute }, children: [
              "on ",
              I.name
            ] })
          ] }),
          /* @__PURE__ */ e.jsxs("div", { style: { fontSize: 10.5, color: i.mute, lineHeight: 1.4 }, children: [
            "Rate locked for ",
            /* @__PURE__ */ e.jsx("span", { style: { color: i.ink, fontWeight: 500 }, children: "9:42" })
          ] })
        ] })
      ] }),
      /* @__PURE__ */ e.jsxs(v, { gap: 6, children: [
        /* @__PURE__ */ e.jsx("div", { style: { fontSize: 11, color: i.mute, textTransform: "uppercase", letterSpacing: 0.6 }, children: "Deposit address" }),
        /* @__PURE__ */ e.jsxs("div", { style: {
          display: "flex",
          alignItems: "center",
          border: `1px solid ${i.hair}`,
          borderRadius: 10,
          background: "#fff",
          overflow: "hidden"
        }, children: [
          /* @__PURE__ */ e.jsx("div", { style: {
            flex: 1,
            padding: "10px 12px",
            fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
            fontSize: 12.5,
            color: ne ? i.ink : i.mute,
            letterSpacing: -0.2,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap"
          }, children: g ? "Generating address…" : ne || "—" }),
          /* @__PURE__ */ e.jsx("button", { onClick: Se, disabled: !ne, style: {
            height: 40,
            padding: "0 14px",
            border: "none",
            borderLeft: `1px solid ${i.hair}`,
            background: ee ? i.accentSoft : "#fff",
            color: ee ? i.accent : ne ? i.ink : i.mute,
            fontSize: 12,
            fontWeight: 500,
            cursor: ne ? "pointer" : "not-allowed",
            fontFamily: "inherit",
            display: "flex",
            alignItems: "center",
            gap: 6
          }, children: ee ? /* @__PURE__ */ e.jsxs(e.Fragment, { children: [
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
        t && /* @__PURE__ */ e.jsxs(v, { gap: 6, children: [
          /* @__PURE__ */ e.jsx("div", { style: { fontSize: 11.5, color: i.err }, children: t }),
          /* @__PURE__ */ e.jsx(
            "button",
            {
              onClick: () => {
                se(!1), Re.current = null;
              },
              style: {
                alignSelf: "flex-start",
                padding: "6px 10px",
                borderRadius: 7,
                background: "transparent",
                border: `1px solid ${i.hair}`,
                cursor: "pointer",
                fontFamily: "inherit",
                fontSize: 11.5,
                color: i.ink
              },
              children: "Edit refund address"
            }
          )
        ] })
      ] }),
      (te || ye) && /* @__PURE__ */ e.jsxs(v, { gap: 6, children: [
        /* @__PURE__ */ e.jsxs("div", { style: { fontSize: 11, color: i.mute, textTransform: "uppercase", letterSpacing: 0.6, display: "flex", alignItems: "center", gap: 6 }, children: [
          I.id === "XRP" ? "Destination tag" : "Memo",
          /* @__PURE__ */ e.jsx("span", { style: { fontSize: 10, color: i.warn, fontWeight: 600, letterSpacing: 0.4 }, children: "REQUIRED" })
        ] }),
        /* @__PURE__ */ e.jsxs("div", { style: {
          display: "flex",
          alignItems: "center",
          border: `1px solid ${i.hair}`,
          borderRadius: 10,
          background: "#fff",
          overflow: "hidden"
        }, children: [
          /* @__PURE__ */ e.jsx("div", { style: {
            flex: 1,
            padding: "10px 12px",
            fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
            fontSize: 12.5,
            color: te ? i.ink : i.mute,
            letterSpacing: -0.2,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap"
          }, children: g ? "Generating memo…" : te || "—" }),
          /* @__PURE__ */ e.jsx("button", { onClick: Be, disabled: !te, style: {
            height: 40,
            padding: "0 14px",
            border: "none",
            borderLeft: `1px solid ${i.hair}`,
            background: z ? i.accentSoft : "#fff",
            color: z ? i.accent : te ? i.ink : i.mute,
            fontSize: 12,
            fontWeight: 500,
            cursor: te ? "pointer" : "not-allowed",
            fontFamily: "inherit",
            display: "flex",
            alignItems: "center",
            gap: 6
          }, children: z ? /* @__PURE__ */ e.jsxs(e.Fragment, { children: [
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
        /* @__PURE__ */ e.jsxs("div", { style: { fontSize: 11, color: i.warn, lineHeight: 1.5 }, children: [
          "You must include this ",
          I.id === "XRP" ? "destination tag" : "memo",
          " when you send — without it the funds can't be credited and may be lost."
        ] })
      ] }),
      /* @__PURE__ */ e.jsxs("div", { style: {
        background: i.warnSoft,
        border: `1px solid ${i.warn}22`,
        borderRadius: 10,
        padding: "10px 12px",
        display: "flex",
        gap: 10,
        fontSize: 11.5,
        color: i.warn,
        lineHeight: 1.5
      }, children: [
        /* @__PURE__ */ e.jsxs("svg", { width: "14", height: "14", viewBox: "0 0 24 24", fill: "none", style: { flexShrink: 0, marginTop: 1 }, children: [
          /* @__PURE__ */ e.jsx("path", { d: "M12 2L2 20H22L12 2Z", stroke: "currentColor", strokeWidth: "1.8", strokeLinejoin: "round" }),
          /* @__PURE__ */ e.jsx("path", { d: "M12 10V13M12 16V16.01", stroke: "currentColor", strokeWidth: "1.8", strokeLinecap: "round" })
        ] }),
        /* @__PURE__ */ e.jsxs("span", { children: [
          "Only send ",
          /* @__PURE__ */ e.jsx("b", { children: I.token }),
          " on the ",
          /* @__PURE__ */ e.jsx("b", { children: I.name }),
          " network. Sending other assets or from a different network may result in loss."
        ] })
      ] }),
      /* @__PURE__ */ e.jsx("div", { style: {
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "10px 12px",
        background: E === "incomplete_deposit" ? "#FFF5F5" : "#fff",
        border: `1px solid ${E === "incomplete_deposit" ? "#FFD1D1" : i.hair}`,
        borderRadius: 10
      }, children: E === "incomplete_deposit" ? /* @__PURE__ */ e.jsx("div", { style: { flex: 1, fontSize: 12, color: "#D94E4E", fontWeight: 500, lineHeight: 1.4 }, children: "Partial payment received. Still waiting for the remaining balance to complete your order." }) : /* @__PURE__ */ e.jsxs(e.Fragment, { children: [
        /* @__PURE__ */ e.jsxs("div", { style: { position: "relative", width: 10, height: 10 }, children: [
          /* @__PURE__ */ e.jsx("div", { style: { position: "absolute", inset: 0, borderRadius: 5, background: i.accent } }),
          /* @__PURE__ */ e.jsx("div", { style: { position: "absolute", inset: -3, borderRadius: 8, background: i.accent, opacity: 0.25, animation: "wpulse 1.6s ease-in-out infinite" } })
        ] }),
        /* @__PURE__ */ e.jsxs("div", { style: { flex: 1, fontSize: 12, color: i.ink2 }, children: [
          "Watching for deposit on ",
          I.name,
          "…"
        ] })
      ] }) })
    ] }) : /* @__PURE__ */ e.jsxs(v, { gap: 10, children: [
      /* @__PURE__ */ e.jsxs(v, { gap: 6, children: [
        /* @__PURE__ */ e.jsxs("label", { style: { fontSize: 10.5, color: i.mute, textTransform: "uppercase", letterSpacing: 0.6 }, children: [
          "Your refund wallet on ",
          I.name
        ] }),
        /* @__PURE__ */ e.jsx(
          "input",
          {
            autoFocus: !0,
            placeholder: Un[I.id] ?? "Paste your wallet address",
            value: J,
            onChange: (C) => he(C.target.value),
            onKeyDown: (C) => {
              C.key === "Enter" && Te();
            },
            style: {
              width: "100%",
              boxSizing: "border-box",
              padding: "11px 14px",
              borderRadius: 10,
              border: `1px solid ${i.hair}`,
              background: "#fff",
              fontSize: 13,
              fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
              color: i.ink,
              outline: "none",
              letterSpacing: -0.2
            }
          }
        ),
        /* @__PURE__ */ e.jsxs("div", { style: { fontSize: 11, color: i.mute, lineHeight: 1.5 }, children: [
          "If the swap fails or you send the wrong amount, funds are returned to this address. Must be a valid address on ",
          /* @__PURE__ */ e.jsx("b", { children: I.name }),
          "."
        ] })
      ] }),
      /* @__PURE__ */ e.jsx(
        "button",
        {
          onClick: Te,
          disabled: !J.trim(),
          style: {
            ...Ye,
            opacity: J.trim() ? 1 : 0.5,
            cursor: J.trim() ? "pointer" : "not-allowed"
          },
          children: "Generate deposit address"
        }
      )
    ] }) : /* @__PURE__ */ e.jsx("div", { style: {
      background: i.panel,
      border: `1px dashed ${i.hair}`,
      borderRadius: 12,
      padding: "28px 16px",
      textAlign: "center",
      fontSize: 12.5,
      color: i.mute,
      lineHeight: 1.5
    }, children: "Pick a network above to generate your deposit address." })
  ] });
}
const Jt = {
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
}, yt = {
  width: "100%",
  padding: "11px 14px",
  borderRadius: 10,
  border: `1px solid ${i.hair}`,
  background: "#fff",
  fontSize: 14,
  fontWeight: 500,
  color: i.ink,
  fontFamily: "inherit",
  outline: "none",
  boxSizing: "border-box"
};
function $n({
  merchant: a,
  value: o,
  onChange: d,
  onSubmit: h,
  submitting: p,
  error: l
}) {
  const j = Jt[a.currency] ?? [], g = o.institution.length > 0 && o.accountIdentifier.trim().length >= 8 && o.accountName.trim().length >= 2;
  return /* @__PURE__ */ e.jsxs(v, { gap: 14, style: { padding: "16px 20px 6px" }, children: [
    /* @__PURE__ */ e.jsxs(v, { gap: 4, children: [
      /* @__PURE__ */ e.jsx("div", { style: { fontSize: 18, fontWeight: 600, letterSpacing: -0.3 }, children: "Where should refunds go?" }),
      /* @__PURE__ */ e.jsx("div", { style: { fontSize: 12.5, color: i.mute, lineHeight: 1.5 }, children: "If your payment can't be matched, we'll return the funds to this account. Must be in your name." })
    ] }),
    /* @__PURE__ */ e.jsxs(v, { gap: 10, children: [
      /* @__PURE__ */ e.jsxs(v, { gap: 6, children: [
        /* @__PURE__ */ e.jsx("label", { style: { fontSize: 10.5, color: i.mute, textTransform: "uppercase", letterSpacing: 0.6 }, children: "Bank" }),
        /* @__PURE__ */ e.jsxs(
          "select",
          {
            value: o.institution,
            onChange: (t) => d({ ...o, institution: t.target.value }),
            style: { ...yt, appearance: "none", backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 24 24' fill='none'><path d='M6 9L12 15L18 9' stroke='%236B7572' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'/></svg>")`, backgroundRepeat: "no-repeat", backgroundPosition: "right 12px center", paddingRight: 36 },
            children: [
              /* @__PURE__ */ e.jsx("option", { value: "", disabled: !0, children: "Select your bank…" }),
              j.map((t) => /* @__PURE__ */ e.jsx("option", { value: t.code, children: t.name }, t.code))
            ]
          }
        )
      ] }),
      /* @__PURE__ */ e.jsxs(v, { gap: 6, children: [
        /* @__PURE__ */ e.jsx("label", { style: { fontSize: 10.5, color: i.mute, textTransform: "uppercase", letterSpacing: 0.6 }, children: "Account number" }),
        /* @__PURE__ */ e.jsx(
          "input",
          {
            inputMode: "numeric",
            placeholder: "0123456789",
            value: o.accountIdentifier,
            onChange: (t) => d({ ...o, accountIdentifier: t.target.value.replace(/\D/g, "") }),
            style: { ...yt, fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", letterSpacing: -0.2 }
          }
        )
      ] }),
      /* @__PURE__ */ e.jsxs(v, { gap: 6, children: [
        /* @__PURE__ */ e.jsx("label", { style: { fontSize: 10.5, color: i.mute, textTransform: "uppercase", letterSpacing: 0.6 }, children: "Account name" }),
        /* @__PURE__ */ e.jsx(
          "input",
          {
            placeholder: "Full name as it appears on your account",
            value: o.accountName,
            onChange: (t) => d({ ...o, accountName: t.target.value }),
            style: yt
          }
        )
      ] })
    ] }),
    /* @__PURE__ */ e.jsxs("div", { style: {
      background: i.panel,
      border: `1px solid ${i.hair}`,
      borderRadius: 10,
      padding: "10px 12px",
      display: "flex",
      gap: 10,
      fontSize: 11.5,
      color: i.ink2,
      lineHeight: 1.5
    }, children: [
      /* @__PURE__ */ e.jsxs("svg", { width: "14", height: "14", viewBox: "0 0 24 24", fill: "none", style: { flexShrink: 0, marginTop: 1, color: i.mute }, children: [
        /* @__PURE__ */ e.jsx("circle", { cx: "12", cy: "12", r: "10", stroke: "currentColor", strokeWidth: "1.8" }),
        /* @__PURE__ */ e.jsx("path", { d: "M12 8V13M12 16V16.01", stroke: "currentColor", strokeWidth: "1.8", strokeLinecap: "round" })
      ] }),
      /* @__PURE__ */ e.jsx("span", { children: "We only use this account if the payment fails. Refunds arrive within 1 business day." })
    ] }),
    l && /* @__PURE__ */ e.jsx("div", { style: {
      background: "#FBEEE9",
      border: `1px solid ${i.err}33`,
      borderRadius: 10,
      padding: "10px 12px",
      fontSize: 12,
      color: i.err,
      lineHeight: 1.5
    }, children: l }),
    /* @__PURE__ */ e.jsx(
      "button",
      {
        onClick: h,
        disabled: !g || p,
        style: { ...Ye, opacity: g && !p ? 1 : 0.5, cursor: g && !p ? "pointer" : "not-allowed" },
        children: p ? "Creating payment…" : "Continue"
      }
    )
  ] });
}
const Hn = {
  NGN: { bank: "Wema Bank", accountNumber: "8203 7461 92", accountName: "Weave / Afriloom-0481" }
};
function en(a, o) {
  const d = (Jt[a] ?? []).find((h) => h.code === o);
  return (d == null ? void 0 : d.name) ?? o;
}
function Gn({
  onNext: a,
  merchant: o,
  bankDetails: d,
  apiKey: h,
  orderId: p,
  currencies: l,
  fmtCur: j
}) {
  const g = Ce[o.currency], t = d ? {
    bank: en(o.currency, d.institution),
    accountNumber: d.accountIdentifier,
    accountName: d.accountName
  } : Hn[o.currency], n = d != null && d.amountToTransfer ? (() => {
    const x = d.amountToTransfer, k = x.includes(".") ? x.split(".")[1].length : 0;
    return j(Number(x), o.currency, k);
  })() : j(o.amount, o.currency), [s, c] = L(null), [u, y] = L(9), [m, w] = L(42);
  Ee(() => {
    const x = setInterval(() => {
      w((k) => k > 0 ? k - 1 : (y((R) => Math.max(0, R - 1)), 59));
    }, 1e3);
    return () => clearInterval(x);
  }, []), Ee(() => {
    if (!p) return;
    let x = !1, k;
    const R = async () => {
      if (!x) {
        try {
          const O = await lt(h, p), V = String(O.status ?? "").toLowerCase();
          if (V && V !== "awaiting_deposit") {
            x = !0, V === "completed" ? a("success") : ["failed", "refunded"].includes(V) ? a("error") : a("processing");
            return;
          }
        } catch {
        }
        k = setTimeout(R, 5e3);
      }
    };
    return R(), () => {
      x = !0, clearTimeout(k);
    };
  }, [h, p, a]);
  const S = (x, k) => {
    var R;
    (R = navigator.clipboard) == null || R.writeText(k), c(x), setTimeout(() => c(null), 1400);
  }, E = ({ label: x, value: k, k: R, mono: O = !0 }) => /* @__PURE__ */ e.jsxs(K, { justify: "space-between", style: { padding: "11px 14px" }, children: [
    /* @__PURE__ */ e.jsxs(v, { gap: 2, style: { minWidth: 0 }, children: [
      /* @__PURE__ */ e.jsx("div", { style: { fontSize: 10.5, color: i.mute, textTransform: "uppercase", letterSpacing: 0.6 }, children: x }),
      /* @__PURE__ */ e.jsx("div", { style: {
        fontSize: 14,
        fontWeight: 500,
        color: i.ink,
        fontFamily: O ? "ui-monospace, SFMono-Regular, Menlo, monospace" : "inherit",
        letterSpacing: O ? -0.2 : 0,
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap"
      }, children: k })
    ] }),
    /* @__PURE__ */ e.jsx("button", { onClick: () => S(R, k), style: {
      height: 28,
      padding: "0 10px",
      borderRadius: 7,
      border: `1px solid ${i.hair}`,
      background: s === R ? i.accentSoft : "#fff",
      color: s === R ? i.accent : i.ink,
      fontSize: 11.5,
      fontWeight: 500,
      cursor: "pointer",
      fontFamily: "inherit",
      display: "flex",
      alignItems: "center",
      gap: 5
    }, children: s === R ? /* @__PURE__ */ e.jsxs(e.Fragment, { children: [
      /* @__PURE__ */ e.jsx("svg", { width: "10", height: "10", viewBox: "0 0 24 24", fill: "none", children: /* @__PURE__ */ e.jsx("path", { d: "M5 12L10 17L19 7", stroke: "currentColor", strokeWidth: "3", strokeLinecap: "round", strokeLinejoin: "round" }) }),
      "Copied"
    ] }) : "Copy" })
  ] });
  return /* @__PURE__ */ e.jsxs(v, { gap: 14, style: { padding: "16px 20px 6px" }, children: [
    /* @__PURE__ */ e.jsxs(v, { gap: 4, children: [
      /* @__PURE__ */ e.jsxs(K, { justify: "space-between", align: "flex-start", children: [
        /* @__PURE__ */ e.jsxs("div", { style: { fontSize: 18, fontWeight: 600, letterSpacing: -0.3 }, children: [
          "Send ",
          n
        ] }),
        /* @__PURE__ */ e.jsxs(St, { tone: "warn", children: [
          /* @__PURE__ */ e.jsxs("svg", { width: "10", height: "10", viewBox: "0 0 24 24", fill: "none", style: { marginRight: 2 }, children: [
            /* @__PURE__ */ e.jsx("circle", { cx: "12", cy: "12", r: "10", stroke: "currentColor", strokeWidth: "2" }),
            /* @__PURE__ */ e.jsx("path", { d: "M12 7V12L15 14", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round" })
          ] }),
          u,
          ":",
          String(m).padStart(2, "0")
        ] })
      ] }),
      /* @__PURE__ */ e.jsx("div", { style: { fontSize: 12.5, color: i.mute, lineHeight: 1.5 }, children: "Open your bank app and transfer to this account. We'll confirm your payment automatically — no need to send proof." })
    ] }),
    /* @__PURE__ */ e.jsxs("div", { style: { background: "#fff", border: `1px solid ${i.hair}`, borderRadius: 12, overflow: "hidden" }, children: [
      /* @__PURE__ */ e.jsxs(K, { gap: 10, style: { padding: "12px 14px", background: i.panel, borderBottom: `1px solid ${i.hair}` }, children: [
        /* @__PURE__ */ e.jsx("div", { style: { width: 28, height: 28, borderRadius: 14, background: "#fff", border: `1px solid ${i.hair}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 600, color: i.ink }, children: g.flag }),
        /* @__PURE__ */ e.jsxs(v, { gap: 1, style: { flex: 1 }, children: [
          /* @__PURE__ */ e.jsx("div", { style: { fontSize: 13, fontWeight: 500 }, children: t.bank }),
          /* @__PURE__ */ e.jsxs("div", { style: { fontSize: 11, color: i.mute }, children: [
            "Virtual account · one-time · ",
            o.currency
          ] })
        ] })
      ] }),
      /* @__PURE__ */ e.jsx(E, { label: "Account number", value: t.accountNumber, k: "acc" }),
      /* @__PURE__ */ e.jsx(Ge, {}),
      /* @__PURE__ */ e.jsx(E, { label: "Account name", value: t.accountName, k: "name", mono: !1 }),
      /* @__PURE__ */ e.jsx(Ge, {}),
      /* @__PURE__ */ e.jsx(E, { label: "Amount", value: n, k: "amt", mono: !1 })
    ] }),
    /* @__PURE__ */ e.jsxs("div", { style: {
      background: i.warnSoft,
      border: `1px solid ${i.warn}22`,
      borderRadius: 10,
      padding: "10px 12px",
      display: "flex",
      gap: 10,
      fontSize: 11.5,
      color: i.warn,
      lineHeight: 1.5
    }, children: [
      /* @__PURE__ */ e.jsxs("svg", { width: "14", height: "14", viewBox: "0 0 24 24", fill: "none", style: { flexShrink: 0, marginTop: 1 }, children: [
        /* @__PURE__ */ e.jsx("path", { d: "M12 2L2 20H22L12 2Z", stroke: "currentColor", strokeWidth: "1.8", strokeLinejoin: "round" }),
        /* @__PURE__ */ e.jsx("path", { d: "M12 10V13M12 16V16.01", stroke: "currentColor", strokeWidth: "1.8", strokeLinecap: "round" })
      ] }),
      /* @__PURE__ */ e.jsx("span", { children: "Send the exact amount. Any difference may delay delivery." })
    ] })
  ] });
}
const Yn = {
  name: "Afriloom Textiles",
  amount: 700,
  currency: "NGN"
}, Nt = {
  Base: "BASE",
  Optimism: "OPTIMISM",
  Ethereum: "ETHEREUM",
  Arbitrum: "ARBITRUM",
  Polygon: "POLYGON"
};
function qn({
  merchant: a = Yn,
  apiKey: o,
  userAddress: d,
  theme: h = "organic",
  borderRadius: p = 16,
  accentColor: l,
  onSuccess: j,
  onError: g,
  onClose: t
}) {
  const n = o ?? (typeof window < "u" ? window.__WEAVE_API_KEY__ : void 0) ?? "pk_live_72a9e3afde82acf51db54bbcaa65832f4b549c56294fe88f" ?? "pk_test_demo", s = d ?? "0x2B4fB6F7255DeF56d985fb01134ab1431Efbd3be" ?? "0x0000000000000000000000000000000000000000", [c, u] = L("connect"), [y, m] = L("offramp"), [w, S] = L(0), [E, x] = L(null), [k, R] = L(!1), [O, V] = L({
    institution: "",
    accountIdentifier: "",
    accountName: ""
  }), [Q, Z] = L(null), [J, he] = L(null), [X, se] = L(null), [ee, U] = L(null), [z, ge] = L(null), [de, I] = L(null), [ne, te] = L(null), [ke, we] = L(!1), [Ae, me] = L(null), [Re, ye] = L(null), [Te, Se] = L(!1), [Be, fe] = L(!1), [Me, C] = L(null), [W, Pe] = L({
    fiat: Pt,
    crypto: pn
  }), ae = ot(0), le = ot(0);
  Ee(() => {
    if (En(n).then((T) => {
      T && Pe(T);
    }).catch(() => {
    }), a.sourceAssetKey && a.amountIn === "source") {
      const T = W.crypto.findIndex((D) => {
        var $;
        return `${D.id}:${D.token}` === (($ = a.sourceAssetKey) == null ? void 0 : $.split("crypto:")[1]);
      });
      T !== -1 && (x(T), m("offramp"), u("deposit"));
    }
  }, [a.sourceAssetKey, a.amountIn, n]);
  const re = W.fiat.reduce((T, D) => {
    const $ = D.key.split(":").pop();
    return T[$] = {
      name: D.name,
      symbol: D.symbol,
      flag: D.flag,
      rate: D.rate,
      min: D.min,
      country: D.country,
      psp: "GTBank",
      bank: "GTBank ••7890",
      method: "Bank transfer"
    }, T;
  }, {}), Ve = W.crypto, oe = (T, D, $) => {
    const be = re[D] || Ce[D];
    if (!be) return `${D} ${T}`;
    const Ie = !!be ? 0 : 4, xe = $ ?? (Number.isInteger(T) ? 0 : Ie), We = Math.pow(10, xe), je = xe > 0 ? Math.ceil(T * We) / We : Math.ceil(T), ue = new Intl.NumberFormat("en-US", { minimumFractionDigits: xe, maximumFractionDigits: xe }).format(je);
    return `${be.symbol}${ue}`;
  }, De = (T) => {
    C(null), Z(null), se(null), U(null), me(null), he(null), ye(null), T === "fiat" ? (m("onramp"), u("refundAccount")) : T === "crypto" ? (m("offramp"), u("wallet")) : T === "deposit" && (m("offramp"), u("deposit"));
  }, ct = async (T, D, $) => {
    const be = ++ae.current;
    we(!0), me(null), se(null), U(null), ge(null), I(null), te(null);
    try {
      const ve = pt(T, D), Ie = tt(a.currency), xe = a.amountIn ?? "dest", We = await gt(n, {
        from: ve,
        to: Ie,
        amount: a.amount,
        amountIn: xe
      }), ue = await mt(n, {
        source: {
          inline: { kind: "crypto_wallet", assetKey: ve, walletAddress: "" }
        },
        amount: a.amount,
        amountIn: xe,
        refundAddress: $
      });
      if (ae.current !== be) return;
      Z(ue.order.id), se(ue.nextAction.depositAddress ?? null), U(ue.nextAction.depositMemo ?? null), ge(typeof ue.nextAction.amount == "number" ? ue.nextAction.amount : null), I(ue.nextAction.token ?? D), te(ue.nextAction.chain ?? T);
    } catch (ve) {
      if (ae.current !== be) return;
      me(ve.message ?? "Could not generate a deposit address"), g == null || g(ve);
    } finally {
      ae.current === be && we(!1);
    }
  }, Qe = async () => {
    u("quote");
    const T = nt[w ?? 0], D = ++le.current;
    Se(!0), ye(null);
    try {
      const $ = await gt(n, {
        from: pt(Nt[T.chain] ?? T.chain, T.token),
        to: tt(a.currency),
        amount: a.amount,
        amountIn: "dest"
      });
      if (le.current !== D) return;
      ye({
        estimatedFiat: $.estimatedDest,
        netUsdc: $.breakdown.netUsd,
        fiatCurrency: a.currency,
        breakdown: {
          inputAmount: $.breakdown.usdEquivalent,
          inputToken: T.token,
          fastPath: $.route.steps.length === 1,
          bridgeFeeUsd: $.breakdown.bridgeFeeUsd,
          senderFeeUsd: $.breakdown.senderFeeUsd,
          appFeeUsd: $.breakdown.appFeeUsd,
          sellRate: $.breakdown.sellRate ?? 0
        }
      });
    } catch {
    } finally {
      le.current === D && Se(!1);
    }
  }, Fe = (T) => {
    T === "success" && j && Q && j({ orderId: Q, status: "completed" }), u(T);
  }, dt = async () => {
    fe(!0), C(null);
    try {
      const T = {
        inline: {
          kind: "bank_account",
          assetKey: tt(a.currency),
          bankInstitution: O.institution,
          bankAccountIdentifier: O.accountIdentifier,
          bankAccountName: O.accountName
        }
      }, D = await mt(n, { source: T, amount: a.amount });
      Z(D.order.id), he(D.nextAction.bankDetails ?? null), u("vaccount");
    } catch (T) {
      C(T.message ?? "Failed to create order"), g == null || g(T);
    } finally {
      fe(!1);
    }
  }, Ze = async () => {
    const T = nt[w ?? 0];
    fe(!0), C(null);
    try {
      const D = pt(Nt[T.chain] ?? T.chain, T.token), $ = tt(a.currency), be = await gt(n, {
        from: D,
        to: $,
        amount: a.amount,
        amountIn: "dest"
      }), Ie = await mt(n, { source: {
        inline: { kind: "crypto_wallet", assetKey: D, walletAddress: s }
      }, amount: a.amount, amountIn: "dest" });
      Z(Ie.order.id), se(Ie.nextAction.depositAddress ?? null), u("processing");
    } catch (D) {
      C(D.message ?? "Failed to create order"), g == null || g(D);
    } finally {
      fe(!1);
    }
  };
  if (k)
    return /* @__PURE__ */ e.jsxs("div", { style: {
      position: "absolute",
      bottom: 24,
      right: 24,
      zIndex: 10,
      background: i.ink,
      color: "#fff",
      padding: "10px 16px",
      borderRadius: 999,
      fontSize: 13,
      display: "flex",
      alignItems: "center",
      gap: 8,
      cursor: "pointer",
      boxShadow: "0 10px 30px rgba(0,0,0,0.25)"
    }, onClick: () => R(!1), children: [
      /* @__PURE__ */ e.jsx(vt, { size: 16 }),
      "Pay with Weave"
    ] });
  const Ue = nt[w ?? 0], _e = y === "onramp", ze = (T) => {
    Z(null), C(null), he(null), se(null), U(null), me(null), ye(null), u(T);
  }, Je = (() => {
    if (c === "connect") return /* @__PURE__ */ e.jsx(In, { onPick: De, merchant: a, currencies: re, fmtCur: oe });
    if (_e) {
      if (c === "refundAccount") return /* @__PURE__ */ e.jsx($n, { merchant: a, value: O, onChange: V, onSubmit: dt, submitting: Be, error: Me });
      if (c === "vaccount") return /* @__PURE__ */ e.jsx(Gn, { onNext: Fe, merchant: a, bankDetails: J, apiKey: n, orderId: Q, currencies: re, fmtCur: oe });
      if (c === "processing") return /* @__PURE__ */ e.jsx(Mt, { onNext: Fe, merchant: a, mode: "fiat", apiKey: n, orderId: Q, bankDetails: J, currencies: re, fmtCur: oe });
      if (c === "success") return /* @__PURE__ */ e.jsx(Dt, { onNext: Fe, balance: Ue, merchant: a, direction: y, apiKey: n, orderId: Q, accentColor: l, currencies: re, fmtCur: oe });
      if (c === "error") return /* @__PURE__ */ e.jsx(Ot, { onNext: () => ze("connect"), onBack: () => ze("refundAccount") });
    } else {
      if (c === "deposit") return /* @__PURE__ */ e.jsx(Wn, { onNext: Fe, merchant: a, depositAddress: X, depositMemo: ee, amountToSend: z, sourceToken: de, sourceChain: ne, loading: ke, error: Ae, onChainChange: ct, ready: !!Q && !!X && !ke, apiKey: n, orderId: Q, preSelectedChainIdx: E, depositChains: Ve, currencies: re, fmtCur: oe });
      if (c === "wallet") return /* @__PURE__ */ e.jsx(Ln, { onNext: () => Qe(), merchant: a, balances: nt, selected: w, setSelected: S, currencies: re });
      if (c === "quote") return /* @__PURE__ */ e.jsx(Mn, { merchant: a, balance: Ue, onConfirm: Ze, submitting: Be, error: Me, quote: Re, quoteLoading: Te, currencies: re, fmtCur: oe });
      if (c === "processing") return /* @__PURE__ */ e.jsx(Mt, { onNext: Fe, merchant: a, mode: "crypto", apiKey: n, orderId: Q, currencies: re, fmtCur: oe });
      if (c === "success") return /* @__PURE__ */ e.jsx(Dt, { onNext: Fe, balance: Ue, merchant: a, direction: y, apiKey: n, orderId: Q, accentColor: l, currencies: re, fmtCur: oe });
      if (c === "error") return /* @__PURE__ */ e.jsx(Ot, { onNext: () => ze("connect"), onBack: () => ze("quote") });
    }
    return null;
  })(), et = ["wallet", "quote", "deposit"].includes(c) && !_e || ["refundAccount", "vaccount"].includes(c) && _e, ut = c === "quote" ? "wallet" : c === "vaccount" ? "refundAccount" : "connect";
  return /* @__PURE__ */ e.jsxs(
    "div",
    {
      className: `weave-checkout weave-theme-${h}`,
      style: {
        "--weave-accent": st[l] || l || "#0F5D4C",
        "--weave-accent-soft": (st[l] || l || "#0F5D4C") + "15",
        width: 400,
        background: i.surface,
        borderRadius: p,
        boxShadow: "0 30px 80px rgba(11, 15, 14, 0.22), 0 0 0 1px rgba(0,0,0,0.04)",
        overflow: "hidden",
        fontFamily: "Inter, -apple-system, BlinkMacSystemFont, sans-serif",
        color: i.ink,
        animation: "wslide 0.35s cubic-bezier(0.2, 1, 0.3, 1)"
      },
      children: [
        /* @__PURE__ */ e.jsx(
          Bn,
          {
            merchantName: a.name,
            onClose: () => {
              R(!0), t == null || t();
            },
            showBack: et,
            onBack: () => u(ut)
          }
        ),
        /* @__PURE__ */ e.jsx("div", { style: { animation: "wfade 0.25s ease" }, children: Je }, c),
        /* @__PURE__ */ e.jsx(Fn, {})
      ]
    }
  );
}
const q = {
  ink: "#0B0F0E",
  ink2: "#3A4240",
  mute: "#6B7572",
  hair: "#E8EAE6",
  page: "#F5F4EF"
}, Vn = { NGN: "₦" }, rt = (a, o) => `${Vn[o] ?? ""}${new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(a)}`;
function Zn({ currency: a = "NGN", amount: o = 15e4 }) {
  const d = [
    { name: "Ẹ̀wà Handwoven Throw", sub: "Indigo / 150 × 200cm", price: 12e4 },
    { name: "Aso-Oke Runner", sub: "Earth / 35 × 180cm", price: 25e3 }
  ];
  return /* @__PURE__ */ e.jsxs("div", { style: {
    position: "absolute",
    inset: 0,
    background: q.page,
    fontFamily: "Inter, -apple-system, sans-serif",
    color: q.ink,
    overflow: "hidden"
  }, children: [
    /* @__PURE__ */ e.jsxs("div", { style: {
      height: 56,
      padding: "0 32px",
      borderBottom: `1px solid ${q.hair}`,
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
        /* @__PURE__ */ e.jsx("span", { style: { color: q.mute, fontSize: 13, marginLeft: 16 }, children: "Shop · Journal · About" })
      ] }),
      /* @__PURE__ */ e.jsxs("div", { style: { marginLeft: "auto", display: "flex", gap: 14, fontSize: 13, color: q.ink2 }, children: [
        /* @__PURE__ */ e.jsx("span", { children: "Search" }),
        /* @__PURE__ */ e.jsx("span", { children: "Account" }),
        /* @__PURE__ */ e.jsx("span", { children: "Cart (2)" })
      ] })
    ] }),
    /* @__PURE__ */ e.jsxs("div", { style: { display: "flex", padding: "32px 32px", gap: 40, height: "calc(100% - 56px)" }, children: [
      /* @__PURE__ */ e.jsxs("div", { style: { flex: "0 0 340px" }, children: [
        /* @__PURE__ */ e.jsx("div", { style: { fontSize: 11, color: q.mute, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 14 }, children: "Order summary" }),
        d.map((h, p) => /* @__PURE__ */ e.jsxs("div", { style: { display: "flex", gap: 14, padding: "12px 0", borderBottom: `1px solid ${q.hair}` }, children: [
          /* @__PURE__ */ e.jsx("div", { style: {
            width: 60,
            height: 72,
            borderRadius: 6,
            flexShrink: 0,
            background: p === 0 ? "repeating-linear-gradient(90deg, #2D3E60 0 6px, #1F2D45 6px 12px, #3A4F75 12px 16px)" : "repeating-linear-gradient(0deg, #8B6D47 0 4px, #6B5236 4px 8px, #A8855D 8px 14px)"
          } }),
          /* @__PURE__ */ e.jsxs("div", { style: { flex: 1, fontSize: 12.5 }, children: [
            /* @__PURE__ */ e.jsx("div", { style: { fontWeight: 500 }, children: h.name }),
            /* @__PURE__ */ e.jsx("div", { style: { color: q.mute, fontSize: 11.5, marginTop: 2 }, children: h.sub }),
            /* @__PURE__ */ e.jsx("div", { style: { marginTop: 4 }, children: rt(h.price, a) })
          ] })
        ] }, p)),
        /* @__PURE__ */ e.jsxs("div", { style: { padding: "12px 0", fontSize: 12.5, display: "flex", flexDirection: "column", gap: 6 }, children: [
          /* @__PURE__ */ e.jsxs("div", { style: { display: "flex", justifyContent: "space-between", color: q.mute }, children: [
            /* @__PURE__ */ e.jsx("span", { children: "Subtotal" }),
            /* @__PURE__ */ e.jsx("span", { children: rt(145e3, a) })
          ] }),
          /* @__PURE__ */ e.jsxs("div", { style: { display: "flex", justifyContent: "space-between", color: q.mute }, children: [
            /* @__PURE__ */ e.jsx("span", { children: "Shipping" }),
            /* @__PURE__ */ e.jsx("span", { children: rt(5e3, a) })
          ] }),
          /* @__PURE__ */ e.jsxs("div", { style: { display: "flex", justifyContent: "space-between", fontWeight: 600, fontSize: 14, marginTop: 6, color: q.ink }, children: [
            /* @__PURE__ */ e.jsx("span", { children: "Total" }),
            /* @__PURE__ */ e.jsx("span", { children: rt(o, a) })
          ] })
        ] })
      ] }),
      /* @__PURE__ */ e.jsxs("div", { style: { flex: 1, maxWidth: 440 }, children: [
        /* @__PURE__ */ e.jsx("div", { style: { fontSize: 11, color: q.mute, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 14 }, children: "Payment" }),
        /* @__PURE__ */ e.jsxs("div", { style: { display: "flex", flexDirection: "column", gap: 10, opacity: 0.4 }, children: [
          /* @__PURE__ */ e.jsx("div", { style: { height: 42, border: `1px solid ${q.hair}`, borderRadius: 8, background: "#fff", display: "flex", alignItems: "center", padding: "0 14px", fontSize: 13, color: q.mute }, children: "Email" }),
          /* @__PURE__ */ e.jsx("div", { style: { height: 42, border: `1px solid ${q.hair}`, borderRadius: 8, background: "#fff", display: "flex", alignItems: "center", padding: "0 14px", fontSize: 13, color: q.mute }, children: "Card number" }),
          /* @__PURE__ */ e.jsxs("div", { style: { display: "flex", gap: 10 }, children: [
            /* @__PURE__ */ e.jsx("div", { style: { flex: 1, height: 42, border: `1px solid ${q.hair}`, borderRadius: 8, background: "#fff" } }),
            /* @__PURE__ */ e.jsx("div", { style: { flex: 1, height: 42, border: `1px solid ${q.hair}`, borderRadius: 8, background: "#fff" } })
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
  Zn as MerchantBackdrop,
  qn as WeaveCheckout
};
