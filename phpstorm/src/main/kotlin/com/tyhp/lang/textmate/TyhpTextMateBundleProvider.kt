package com.tyhp.lang.textmate

import com.intellij.openapi.diagnostic.logger
import com.intellij.openapi.extensions.PluginAware
import com.intellij.openapi.extensions.PluginDescriptor
import org.jetbrains.plugins.textmate.api.TextMateBundleProvider

class TyhpTextMateBundleProvider : TextMateBundleProvider, PluginAware {
    private var pluginDescriptor: PluginDescriptor? = null

    override fun setPluginDescriptor(pluginDescriptor: PluginDescriptor) {
        this.pluginDescriptor = pluginDescriptor
    }

    override fun getBundles(): List<TextMateBundleProvider.PluginBundle> {
        val path = TyhpTextMateBundleSupport.resolveBundlePath(pluginDescriptor)
        if (path == null) {
            log.warn("Tyhp TextMate bundle not found; .tyhp highlighting will be unstyled until the plugin is rebuilt")
            return emptyList()
        }
        return listOf(TextMateBundleProvider.PluginBundle("Tyhp", path))
    }

    companion object {
        private val log = logger<TyhpTextMateBundleProvider>()
    }
}
