// Screen coordinates stay stable while the native window moves under the pointer.
export function petDrag(button, api, onError = () => {}) {
  let gesture, suppressClick = false, pending, moving = false;
  async function flush() {
    if (moving || !pending) return;
    moving = true;
    try { while (pending) { const point = pending; pending = undefined; await api.botMove(point); } }
    catch (error) { pending = undefined; onError(error); }
    finally { moving = false; }
  }
  button.addEventListener('pointerdown', event => {
    if (event.button !== 0 || gesture) return;
    gesture = { id: event.pointerId, x: event.screenX, y: event.screenY, dragged: false };
    suppressClick = false;
    button.setPointerCapture(event.pointerId);
  });
  button.addEventListener('pointermove', event => {
    if (!gesture || gesture.id !== event.pointerId) return;
    const dx = event.screenX - gesture.x, dy = event.screenY - gesture.y;
    if (!gesture.dragged && Math.hypot(dx, dy) < 6) return;
    const first = !gesture.dragged;
    gesture.dragged = true; suppressClick = true;
    button.classList.add('dragging');
    pending = { phase: first ? 'start' : 'move', startX: gesture.x, startY: gesture.y, x: event.screenX, y: event.screenY };
    // The first message must establish the origin before later positions.
    if (first) { const point = pending; pending = undefined; moving = true; api.botMove(point).catch(onError).finally(() => { moving = false; flush(); }); }
    else flush();
  });
  function release(event) {
    if (!gesture || gesture.id !== event.pointerId) return;
    if (gesture.dragged) { pending = { phase: 'end', startX: gesture.x, startY: gesture.y, x: event.screenX, y: event.screenY }; flush(); }
    gesture = undefined; button.classList.remove('dragging');
    if (button.hasPointerCapture(event.pointerId)) button.releasePointerCapture(event.pointerId);
  }
  button.addEventListener('pointerup', release);
  button.addEventListener('pointercancel', release);
  button.addEventListener('click', event => {
    if (!suppressClick || event.detail === 0) return;
    event.preventDefault(); event.stopImmediatePropagation(); suppressClick = false;
  }, true);
}
