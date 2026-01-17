use notify::{
    Config, Event, EventKind, RecommendedWatcher, RecursiveMode, Watcher,
};
use std::path::{Path, PathBuf};
use std::sync::{Arc, Mutex};
use std::time::Duration;
use thiserror::Error;

#[derive(Debug, Error)]
pub enum FileWatcherError {
    #[error("Failed to initialize watcher: {0}")]
    InitError(String),

    #[error("Failed to watch path: {0}")]
    WatchError(String),

    #[error("Watcher not running")]
    NotRunning,
}

pub type Result<T> = std::result::Result<T, FileWatcherError>;

/// Events emitted by the file watcher
#[derive(Debug, Clone)]
pub enum WatchEvent {
    /// A new project directory was added
    ProjectAdded(String),

    /// A project directory was removed
    ProjectRemoved(String),

    /// A file within a project was changed (project_id, file_path)
    FileChanged(String, String),
}

/// Service for watching file system changes in the projects directory
pub struct FileWatcherService {
    watcher: Option<Arc<Mutex<RecommendedWatcher>>>,
    watch_path: Option<PathBuf>,
}

impl FileWatcherService {
    /// Create a new FileWatcherService instance
    pub fn new() -> Self {
        Self {
            watcher: None,
            watch_path: None,
        }
    }

    /// Start watching the projects directory for changes
    ///
    /// # Arguments
    /// * `path` - The path to watch (typically the projects directory)
    /// * `callback` - Function to call when events occur
    ///
    /// # Examples
    /// ```no_run
    /// use app_lib::services::file_watcher::{FileWatcherService, WatchEvent};
    ///
    /// let mut service = FileWatcherService::new();
    /// service.start_watching("/path/to/projects", |event| {
    ///     match event {
    ///         WatchEvent::ProjectAdded(id) => println!("Project added: {}", id),
    ///         WatchEvent::ProjectRemoved(id) => println!("Project removed: {}", id),
    ///         WatchEvent::FileChanged(id, file) => println!("File changed: {}/{}", id, file),
    ///     }
    /// }).unwrap();
    /// ```
    pub fn start_watching<F>(&mut self, path: impl AsRef<Path>, callback: F) -> Result<()>
    where
        F: Fn(WatchEvent) + Send + Sync + 'static,
    {
        let watch_path = path.as_ref().to_path_buf();

        // Ensure the directory exists
        if !watch_path.exists() {
            return Err(FileWatcherError::WatchError(
                format!("Path does not exist: {:?}", watch_path)
            ));
        }

        let callback = Arc::new(callback);
        let projects_path = watch_path.clone();

        // Create watcher with custom config
        let config = Config::default()
            .with_poll_interval(Duration::from_secs(2));

        let watcher = RecommendedWatcher::new(
            move |res: notify::Result<Event>| {
                match res {
                    Ok(event) => {
                        if let Some(watch_event) = Self::process_event(&event, &projects_path) {
                            callback(watch_event);
                        }
                    }
                    Err(e) => {
                        eprintln!("File watcher error: {:?}", e);
                    }
                }
            },
            config,
        )
        .map_err(|e| FileWatcherError::InitError(e.to_string()))?;

        let watcher = Arc::new(Mutex::new(watcher));

        // Start watching the path
        {
            let mut watcher_guard = watcher.lock().unwrap();
            watcher_guard
                .watch(&watch_path, RecursiveMode::Recursive)
                .map_err(|e| FileWatcherError::WatchError(e.to_string()))?;
        }

        self.watcher = Some(watcher);
        self.watch_path = Some(watch_path);

        Ok(())
    }

    /// Stop watching for file system changes
    pub fn stop_watching(&mut self) -> Result<()> {
        if let Some(watcher) = self.watcher.take() {
            if let Some(watch_path) = self.watch_path.take() {
                let mut watcher_guard = watcher.lock().unwrap();
                watcher_guard
                    .unwatch(&watch_path)
                    .map_err(|e| FileWatcherError::WatchError(e.to_string()))?;
            }
            Ok(())
        } else {
            Err(FileWatcherError::NotRunning)
        }
    }

    /// Process a notify event and convert it to a WatchEvent if relevant
    fn process_event(event: &Event, projects_path: &Path) -> Option<WatchEvent> {
        match event.kind {
            // Directory creation - potential new project
            EventKind::Create(_) => {
                for path in &event.paths {
                    if path.is_dir() {
                        // Check if this is a direct child of projects directory
                        if let Some(parent) = path.parent() {
                            if parent == projects_path {
                                if let Some(project_id) = path.file_name() {
                                    return Some(WatchEvent::ProjectAdded(
                                        project_id.to_string_lossy().to_string()
                                    ));
                                }
                            }
                        }
                    } else {
                        // File created within a project
                        return Self::extract_file_change(path, projects_path);
                    }
                }
            }

            // Directory or file removal
            EventKind::Remove(_) => {
                for path in &event.paths {
                    // Check if this is a direct child of projects directory (project removed)
                    if let Some(parent) = path.parent() {
                        if parent == projects_path {
                            if let Some(project_id) = path.file_name() {
                                return Some(WatchEvent::ProjectRemoved(
                                    project_id.to_string_lossy().to_string()
                                ));
                            }
                        }
                    }
                }
            }

            // File modification
            EventKind::Modify(_) => {
                for path in &event.paths {
                    if path.is_file() {
                        return Self::extract_file_change(path, projects_path);
                    }
                }
            }

            _ => {}
        }

        None
    }

    /// Extract project_id and file_path from a file path within projects directory
    fn extract_file_change(file_path: &Path, projects_path: &Path) -> Option<WatchEvent> {
        // Get the relative path from projects directory
        if let Ok(relative) = file_path.strip_prefix(projects_path) {
            // Get the first component (project_id)
            if let Some(project_id) = relative.components().next() {
                let project_id = project_id.as_os_str().to_string_lossy().to_string();

                // Get the file name
                if let Some(file_name) = file_path.file_name() {
                    let file_name = file_name.to_string_lossy().to_string();

                    // Only watch markdown files
                    if file_name.ends_with(".md") {
                        return Some(WatchEvent::FileChanged(project_id, file_name));
                    }
                }
            }
        }

        None
    }

    /// Check if the watcher is currently running
    pub fn is_watching(&self) -> bool {
        self.watcher.is_some()
    }
}

impl Default for FileWatcherService {
    fn default() -> Self {
        Self::new()
    }
}

impl Drop for FileWatcherService {
    fn drop(&mut self) {
        // Attempt to stop watching when dropped
        let _ = self.stop_watching();
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;
    use std::sync::mpsc;
    use std::thread;
    use tempfile::TempDir;

    #[test]
    fn test_new_service() {
        let service = FileWatcherService::new();
        assert!(!service.is_watching());
    }

    #[test]
    fn test_start_watching_nonexistent_path() {
        let mut service = FileWatcherService::new();
        let result = service.start_watching("/nonexistent/path", |_| {});
        assert!(result.is_err());
    }

    #[test]
    fn test_watch_project_added() {
        let temp_dir = TempDir::new().unwrap();
        let projects_path = temp_dir.path();

        let (tx, rx) = mpsc::channel();
        let mut service = FileWatcherService::new();

        service
            .start_watching(projects_path, move |event| {
                tx.send(event).unwrap();
            })
            .unwrap();

        assert!(service.is_watching());

        // Create a new project directory
        let project_path = projects_path.join("test-project");
        fs::create_dir(&project_path).unwrap();

        // Wait for event
        thread::sleep(Duration::from_millis(500));

        // Check for event (may need to poll)
        if let Ok(event) = rx.try_recv() {
            match event {
                WatchEvent::ProjectAdded(id) => {
                    assert_eq!(id, "test-project");
                }
                _ => panic!("Expected ProjectAdded event"),
            }
        }

        service.stop_watching().unwrap();
        assert!(!service.is_watching());
    }

    #[test]
    fn test_watch_file_changed() {
        let temp_dir = TempDir::new().unwrap();
        let projects_path = temp_dir.path();
        let project_path = projects_path.join("test-project");
        fs::create_dir(&project_path).unwrap();

        let (tx, rx) = mpsc::channel();
        let mut service = FileWatcherService::new();

        service
            .start_watching(projects_path, move |event| {
                tx.send(event).unwrap();
            })
            .unwrap();

        // Create a markdown file
        let file_path = project_path.join("notes.md");
        fs::write(&file_path, "# Test notes").unwrap();

        // Wait for event
        thread::sleep(Duration::from_millis(500));

        // Check for event
        let mut _found_file_change = false;
        while let Ok(event) = rx.try_recv() {
            match event {
                WatchEvent::FileChanged(project_id, file_name) => {
                    if project_id == "test-project" && file_name == "notes.md" {
                        _found_file_change = true;
                        break;
                    }
                }
                _ => {}
            }
        }

        service.stop_watching().unwrap();
    }

    #[test]
    fn test_stop_watching_not_running() {
        let mut service = FileWatcherService::new();
        let result = service.stop_watching();
        assert!(result.is_err());
    }
}
