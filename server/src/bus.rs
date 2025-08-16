use parking_lot::Mutex;
use std::sync::Arc;

#[derive(Clone, Default)]
pub struct Bus { inner: Arc<Mutex<Vec<String>>> }

impl Bus {
    pub fn publish(&self, evt: &str) { self.inner.lock().push(evt.to_string()); }
    pub fn drain(&self) -> Vec<String> { self.inner.lock().drain(..).collect() }
}