# Reglas R8 para Cordova. Fuente de verdad: android-config/proguard-rules.pro
# (el hook copy-android-config.js lo copia a platforms/android/app/).

# Stacktraces legibles en Play Console (el mapping.txt permite desofuscarlos).
-keepattributes SourceFile,LineNumberTable
-renamesourcefileattribute SourceFile

# Los plugins se instancian por nombre (Class.forName) desde res/xml/config.xml,
# así que R8 no puede ver esas referencias.
-keep public class * extends org.apache.cordova.CordovaPlugin
-keep class org.apache.cordova.** { *; }
-dontwarn org.apache.cordova.**

# Puente JavaScript <-> Java
-keepattributes *Annotation*
-keepattributes Signature
-keepattributes InnerClasses,EnclosingMethod
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}

# Código de la app
-keep class es.angelgf.angeldice.** { *; }

-dontwarn com.google.errorprone.annotations.**
-dontwarn javax.annotation.**
