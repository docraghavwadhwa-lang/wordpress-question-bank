package com.nirmayacare.medquiz;

import android.os.Bundle;
import android.webkit.ServiceWorkerClient;
import android.webkit.ServiceWorkerController;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebResourceError;
import android.webkit.WebView;
import android.webkit.JavascriptInterface;
import android.graphics.Canvas;
import android.graphics.Color;
import android.graphics.Paint;
import android.graphics.RectF;
import android.graphics.Typeface;
import android.graphics.BitmapFactory;
import android.graphics.drawable.Drawable;
import android.view.Gravity;
import android.view.View;
import android.view.ViewGroup;
import android.view.animation.Animation;
import android.view.animation.LinearInterpolator;
import android.view.animation.RotateAnimation;
import android.widget.FrameLayout;
import android.widget.ImageView;
import android.widget.LinearLayout;
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
    View spinner = new View(this);
    spinner.setBackground(new ArcSpinner(dp(4)));
    LinearLayout.LayoutParams spinnerParams = new LinearLayout.LayoutParams(dp(30), dp(30));
    spinnerParams.gravity = Gravity.CENTER_HORIZONTAL;
    status.addView(spinner, spinnerParams);
    RotateAnimation spin = new RotateAnimation(0f, 360f,
        Animation.RELATIVE_TO_SELF, 0.5f, Animation.RELATIVE_TO_SELF, 0.5f);
    spin.setDuration(850L);
    spin.setRepeatCount(Animation.INFINITE);
    spin.setInterpolator(new LinearInterpolator());
    spinner.startAnimation(spin);
    TextView label = new TextView(this);
    label.setText("Loading modules…");
    label.setTextColor(Color.argb(222, 255, 255, 255));
    label.setTextSize(13);
    label.setLetterSpacing(0.18f);
    label.setTypeface(Typeface.create("sans-serif-medium", Typeface.NORMAL));
    label.setGravity(Gravity.CENTER);
    LinearLayout.LayoutParams labelParams = new LinearLayout.LayoutParams(
        ViewGroup.LayoutParams.WRAP_CONTENT, ViewGroup.LayoutParams.WRAP_CONTENT);
    labelParams.gravity = Gravity.CENTER_HORIZONTAL;
    labelParams.topMargin = dp(24);
    status.addView(label, labelParams);
    FrameLayout.LayoutParams statusParams = new FrameLayout.LayoutParams(
        ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT,
        Gravity.BOTTOM | Gravity.CENTER_HORIZONTAL);
    statusParams.bottomMargin = dp(108);
    opening.addView(status, statusParams);
    addContentView(opening, new ViewGroup.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));
    bridge.getWebView().addJavascriptInterface(new Object() {
      @JavascriptInterface public void ready() {
        finishOpening();
      }
    }, "ElixirLaunch");
  }

  /** Bold launch spinner: a faint full ring with a thick white arc sweeping round it. */
  private static final class ArcSpinner extends Drawable {
    private final Paint paint = new Paint(Paint.ANTI_ALIAS_FLAG);

    ArcSpinner(int stroke) {
      paint.setStyle(Paint.Style.STROKE);
      paint.setStrokeWidth(stroke);
      paint.setStrokeCap(Paint.Cap.ROUND);
    }

    @Override public void draw(Canvas canvas) {
      RectF ring = new RectF(getBounds());
      float inset = paint.getStrokeWidth() / 2f + 1f;
      ring.inset(inset, inset);
      paint.setColor(Color.argb(48, 255, 255, 255));
      canvas.drawArc(ring, 0f, 360f, false, paint);
      paint.setColor(Color.WHITE);
      canvas.drawArc(ring, -90f, 110f, false, paint);
    }

    @Override public void setAlpha(int alpha) { }
    @Override public void setColorFilter(android.graphics.ColorFilter colorFilter) { }
    @Override public int getOpacity() { return android.graphics.PixelFormat.TRANSLUCENT; }
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
