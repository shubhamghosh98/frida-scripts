/* 
   Android SSL Pinning Bypass Script
   Targeting:
   1. Standard Java TrustManagers
   2. OkHttp3 CertificatePinner
   3. OkHttp (Legacy) CertificatePinner
   4. Dynatrace specific TrustManagers (Found in analysis: com.dynatrace.android.agent.comm.ssl)
*/

Java.perform(function () {
    console.log("[.] Android SSL Pinning Bypass Plan Started...");

    var logger = Java.use("android.util.Log");
    var TAG = "FridaBypass";

    function log(message) {
        console.log(message);
        logger.d(TAG, message);
    }

    // --- 1. Universal TrustManager Bypass ---
    try {
        var X509TrustManager = Java.use('javax.net.ssl.X509TrustManager');
        var SSLContext = Java.use('javax.net.ssl.SSLContext');

        // Create a custom TrustManager that trusts everything
        var TrustManager = Java.registerClass({
            name: 'com.custom.TrustManager',
            implements: [X509TrustManager],
            methods: {
                checkClientTrusted: function (chain, authType) { },
                checkServerTrusted: function (chain, authType) { },
                getAcceptedIssuers: function () { return []; }
            }
        });

        // Hook SSLContext.init to replace TrustManagers
        var SSLContext_init = SSLContext.init.overload('[Ljavax.net.ssl.KeyManager;', '[Ljavax.net.ssl.TrustManager;', 'java.security.SecureRandom');
        SSLContext_init.implementation = function (keyManager, trustManager, secureRandom) {
            log("[+] Intercepting SSLContext.init. Injecting custom TrustManager.");
            SSLContext_init.call(this, keyManager, [TrustManager.$new()], secureRandom);
        };
        log("[+] SSLContext Hooked");
    } catch (err) {
        log("[-] Error Hooking SSLContext: " + err);
    }

    // --- 2. OkHttp3 Bypass ---
    try {
        var CertificatePinner3 = Java.use('okhttp3.CertificatePinner');
        CertificatePinner3.check.overload('java.lang.String', 'java.util.List').implementation = function (hostname, pins) {
            log("[+] OkHttp3: Bypass check for " + hostname);
            // return; // Do nothing, effectively bypassing
        };
        CertificatePinner3.check.overload('java.lang.String', '[Ljava.security.cert.Certificate;').implementation = function (hostname, certs) {
            log("[+] OkHttp3: Bypass check (certs overload) for " + hostname);
            // return;
        };
        log("[+] OkHttp3 CertificatePinner Hooked");
    } catch (err) {
        log("[-] OkHttp3 not found or error: " + err);
    }

    // --- 3. OkHttp (Legacy) Bypass ---
    try {
        var CertificatePinnerLegacy = Java.use('com.squareup.okhttp.CertificatePinner');
        CertificatePinnerLegacy.check.overload('java.lang.String', 'java.util.List').implementation = function (hostname, pins) {
            log("[+] Legacy OkHttp: Bypass check for " + hostname);
            // return;
        };
        log("[+] Legacy OkHttp CertificatePinner Hooked");
    } catch (err) {
        log("[-] Legacy OkHttp not found or error: " + err);
    }

    // --- 4. Dynatrace Specific Bypass ---
    // Found in analysis: com.dynatrace.android.agent.comm.ssl.SimpleX509TrustManager
    // Found in analysis: com.dynatrace.android.agent.comm.ssl.LocalX509TrustManager
    
    function bypassDynatrace(className) {
        try {
            var Clazz = Java.use(className);
            Clazz.checkServerTrusted.implementation = function (chain, authType) {
                log("[+] Dynatrace (" + className + "): Bypassing checkServerTrusted for " + authType);
                // return; // Swallow exception
            };
            log("[+] Dynatrace " + className + " Hooked");
        } catch (err) {
            // Class might not be loaded yet or Proguarded differently
            // log("[-] Dynatrace class " + className + " issue: " + err);
        }
    }

    bypassDynatrace('com.dynatrace.android.agent.comm.ssl.SimpleX509TrustManager');
    bypassDynatrace('com.dynatrace.android.agent.comm.ssl.LocalX509TrustManager');


    // --- 5. WebView bypass (Simple) ---
    try {
        var WebViewClient = Java.use("android.webkit.WebViewClient");
        WebViewClient.onReceivedSslError.implementation = function (webView, sslErrorHandler, sslError) {
            log("[+] WebView: Ignoring SSL Error");
            sslErrorHandler.proceed();
        };
        log("[+] WebViewClient Hooked");
    } catch (err) {
       log("[-] WebViewClient error: " + err);
    }
    
    log("[.] Script Loaded. Waiting for activity...");
});
