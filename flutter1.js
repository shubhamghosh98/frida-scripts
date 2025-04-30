
function disablePinning()
{
    var SslPinningPlugin = Java.use("com.macif.plugin.sslpinningplugin.SslPinningPlugin");
    SslPinningPlugin.checkConnexion.implementation = function()
    {
        console.log("Disabled SslPinningPlugin");
        return true;
    }
}
 
Java.perform(disablePinning)