package com.nirmayacare.medquiz;

import android.os.Bundle;
import android.webkit.ServiceWorkerClient;
import android.webkit.ServiceWorkerController;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebView;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.BridgeWebViewClient;

/** Serves question images (/qimg/*) from inside the APK so they show with no internet. */
public class MainActivity extends BridgeActivity {
  private WebResourceResponse local(WebResourceRequest r) {
    String p = r.getUrl().getPath();
    if (p == null || !p.startsWith("/qimg/")) return null;
    try {
      WebResourceResponse res = new WebResourceResponse("image/webp", null, getAssets().open("public" + p));
      java.util.Map<String, String> h = new java.util.HashMap<>();
      h.put("Access-Control-Allow-Origin", "*");
      h.put("Cache-Control", "max-age=31536000");
      res.setResponseHeaders(h);
      return res;
    } catch (Exception e) {
      return null; // not bundled: fall back to the network
    }
  }

  @Override
  public void onCreate(Bundle savedInstanceState) {
    super.onCreate(savedInstanceState);
    bridge.setWebViewClient(new BridgeWebViewClient(bridge) {
      @Override
      public WebResourceResponse shouldInterceptRequest(WebView v, WebResourceRequest r) {
        WebResourceResponse res = local(r);
        return res != null ? res : super.shouldInterceptRequest(v, r);
      }
    });
    ServiceWorkerController.getInstance().setServiceWorkerClient(new ServiceWorkerClient() {
      @Override
      public WebResourceResponse shouldInterceptRequest(WebResourceRequest r) {
        return local(r);
      }
    });
  }
}
