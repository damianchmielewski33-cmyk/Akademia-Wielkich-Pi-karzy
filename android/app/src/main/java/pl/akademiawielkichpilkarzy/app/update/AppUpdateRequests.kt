package pl.akademiawielkichpilkarzy.app.update

import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.SharedFlow
import kotlinx.coroutines.flow.asSharedFlow

/** Ręczne sprawdzenie aktualizacji (profil / most JS z WebView). */
object AppUpdateRequests {
    private val _manual = MutableSharedFlow<Unit>(extraBufferCapacity = 1)
    val manual: SharedFlow<Unit> = _manual.asSharedFlow()

    private val _install = MutableSharedFlow<Unit>(extraBufferCapacity = 1)
    val install: SharedFlow<Unit> = _install.asSharedFlow()

    fun requestManualCheck() {
        _manual.tryEmit(Unit)
    }

    /** Od razu pobiera i uruchamia instalator — bez drugiego potwierdzenia. */
    fun requestInstall() {
        _install.tryEmit(Unit)
    }
}
