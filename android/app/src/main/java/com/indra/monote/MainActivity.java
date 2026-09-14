package com.indra.monote;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;
import com.indra.monote.snapshot.WidgetBridgePlugin;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(WidgetBridgePlugin.class);
        super.onCreate(savedInstanceState);
    }
}
