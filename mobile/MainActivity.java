package com.nirmayacare.medquiz;

import android.os.Bundle;
import android.webkit.ServiceWorkerClient;
import android.webkit.ServiceWorkerController;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebResourceError;
import android.webkit.WebView;
import android.webkit.JavascriptInterface;
import android.graphics.Color;
import android.graphics.BitmapFactory;
import android.view.Gravity;
import android.view.ViewGroup;
import android.widget.FrameLayout;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.ProgressBar;
import android.widget.TextView;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.BridgeWebViewClient;

/** Serves question images (/qimg/*) from inside the APK so they show with no internet. */
public class MainActivity extends BridgeActivity {
  private FrameLayout opening;

  private int dp(int value) { return Math.round(value * getResources().getDisplayMetrics().density); }
  private void finishOpening() {
    runOnUiThread(() -> {
      if (opening != null && opening.getParent() instanceof ViewGroup) {
        ((ViewGroup) opening.getParent()).removeView(opening);
        opening = null;
      }
    });
  }

  private void showOpening() {
    opening = new FrameLayout(this);
    opening.setBackgroundColor(Color.rgb(23, 140, 142));
    ImageView logo = new ImageView(this);
    try (java.io.InputStream image = getAssets().open("public/opening_logo.png")) {
      logo.setImageBitmap(BitmapFactory.decodeStream(image));
    } catch (java.io.IOException ignored) { }
    logo.setScaleType(ImageView.ScaleType.FIT_CENTER);
    FrameLayout.LayoutParams logoParams = new FrameLayout.LayoutParams(dp(224), dp(224), Gravity.CENTER);
    opening.addView(logo, logoParams);
    LinearLayout status = new LinearLayout(this);
    status.setOrientation(LinearLayout.VERTICAL);
    status.setGravity(Gravity.CENTER);
    ProgressBar progress = new ProgressBar(this);
    progress.setIndeterminateTintList(android.content.res.ColorStateList.valueOf(Color.WHITE));
    status.addView(progress, new LinearLayout.LayoutParams(dp(22), dp(22)));
    TextView label = new TextView(this);
    label.setText("Loading modules…");
    label.setTextColor(Color.WHITE);
    label.setTextSize(12);
    label.setPadding(0, dp(12), 0, 0);
    status.addView(label);
    FrameLayout.LayoutParams statusParams = new FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, dp(70), Gravity.BOTTOM | Gravity.CENTER_HORIZONTAL);
    statusParams.bottomMargin = dp(64);
    opening.addView(status, statusParams);
    addContentView(opening, new ViewGroup.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));
    bridge.getWebView().addJavascriptInterface(new Object() {
      @JavascriptInterface public void ready() {
        finishOpening();
      }
    }, "ElixirLaunch");
  }
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
    showOpening();
    bridge.setWebViewClient(new BridgeWebViewClient(bridge) {
      @Override
      public void onReceivedError(WebView v, WebResourceRequest r, WebResourceError e) {
        super.onReceivedError(v, r, e);
        // Let Capacitor's offline fallback remain usable instead of covering it forever.
        if (r.isForMainFrame()) finishOpening();
      }
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
