Java.perform(function () {

    console.log("[*] Starting Android SSL pinning bypass");

    /*
     * ---------------------------------------------------------
     * 1. Custom TrustManager (kills Trust Anchor error)
     * ---------------------------------------------------------
     */
    var X509TrustManager = Java.use('javax.net.ssl.X509TrustManager');
    var SSLContext = Java.use('javax.net.ssl.SSLContext');

    var TrustManager = Java.registerClass({
        name: 'dev.as.TrustManager',
        implements: [X509TrustManager],
        methods: {
            checkClientTrusted: function (chain, authType) {},
            checkServerTrusted: function (chain, authType) {},
            getAcceptedIssuers: function () {
                return [];
            }
        }
    });

    SSLContext.init.overload(
        '[Ljavax.net.ssl.KeyManager;',
        '[Ljavax.net.ssl.TrustManager;',
        'java.security.SecureRandom'
    ).implementation = function (km, tm, sr) {
        console.log("[+] SSLContext.init() bypassed");
        this.init(km, [TrustManager.$new()], sr);
    };

    /*
     * ---------------------------------------------------------
     * 2. Android 7+ TrustManagerImpl (Conscrypt)
     * ---------------------------------------------------------
     */
    try {
        var TrustManagerImpl = Java.use(
            'com.android.org.conscrypt.TrustManagerImpl'
        );

        TrustManagerImpl.verifyChain.implementation = function (
            untrustedChain,
            trustAnchorChain,
            host,
            authType,
            ocspData,
            tlsSctData
        ) {
            console.log("[+] TrustManagerImpl.verifyChain() bypassed");
            return untrustedChain;
        };
    } catch (e) {
        console.log("[-] TrustManagerImpl not found");
    }

    /*
     * ---------------------------------------------------------
     * 3. OkHttp v3 / v4 Certificate Pinning
     * ---------------------------------------------------------
     */
    try {
        var CertificatePinner = Java.use('okhttp3.CertificatePinner');

        CertificatePinner.check.overload(
            'java.lang.String',
            'java.util.List'
        ).implementation = function (hostname, peerCertificates) {
            console.log("[+] OkHttp CertificatePinner bypassed for " + hostname);
            return;
        };

        CertificatePinner.check.overload(
            'java.lang.String',
            'java.security.cert.Certificate'
        ).implementation = function (hostname, cert) {
            console.log("[+] OkHttp CertificatePinner bypassed for " + hostname);
            return;
        };
    } catch (e) {
        console.log("[-] OkHttp CertificatePinner not found");
    }

    /*
     * ---------------------------------------------------------
     * 4. HostnameVerifier
     * ---------------------------------------------------------
     */
    try {
        var HostnameVerifier = Java.use(
            'javax.net.ssl.HostnameVerifier'
        );

        HostnameVerifier.verify.implementation = function (hostname, session) {
            console.log("[+] HostnameVerifier bypassed for " + hostname);
            return true;
        };
    } catch (e) {
        console.log("[-] HostnameVerifier not hooked");
    }

    /*
     * ---------------------------------------------------------
     * 5. HttpsURLConnection
     * ---------------------------------------------------------
     */
    try {
        var HttpsURLConnection = Java.use(
            'javax.net.ssl.HttpsURLConnection'
        );

        HttpsURLConnection.setDefaultHostnameVerifier.implementation =
            function (verifier) {
                console.log("[+] Default HostnameVerifier bypassed");
            };

        HttpsURLConnection.setSSLSocketFactory.implementation =
            function (factory) {
                console.log("[+] HttpsURLConnection SSL factory bypassed");
            };
    } catch (e) {
        console.log("[-] HttpsURLConnection hooks failed");
    }

    /*
     * ---------------------------------------------------------
     * 6. WebView SSL Errors
     * ---------------------------------------------------------
     */
    try {
        var WebViewClient = Java.use(
            'android.webkit.WebViewClient'
        );

        WebViewClient.onReceivedSslError.implementation =
            function (view, handler, error) {
                console.log("[+] WebView SSL error bypassed");
                handler.proceed();
            };
    } catch (e) {
        console.log("[-] WebViewClient not hooked");
    }

    console.log("[*] SSL pinning bypass fully loaded");
});
