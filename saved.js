<script>
   document
  .querySelectorAll('[ms-code-empty-saved],[ms-code-empty-scheduled],[ms-code-empty-completed]')
  .forEach(el => el.style.display = 'none');
   
document.addEventListener("DOMContentLoaded", function() {
  const memberstack = window.$memberstackDom;
  let isLoggedIn = false;
  let savedItems = [];
  let scheduledItems = {}; 
  let completedItems = {}; 
  let specialDays = [];

async function sendWebhookEvent(eventData) {
  const webhookUrl = 'https://hook.us1.make.com/x1e7nghla4igblqovk5qw4b5136bru4x';
  
  let userEmail = null;
  
  // Get the current member to access email
  try {
    const currentMember = await memberstack.getCurrentMember();
    userEmail = currentMember?.auth?.email || null;
  } catch (error) {
    console.error('Error getting current member for email:', error);
  }
  
  try {
    await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...eventData,
        user_timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        user_email: userEmail
      })
    });
  } catch (error) {
    console.error('Webhook error:', error);
  }
}

  function loadSpecialDays() {
    document
      .querySelectorAll('[ms-special-days] .w-dyn-item')
    specialDays.length = 0; 
   document
     .querySelectorAll('[ms-special-days] .w-dyn-item')

      .forEach(el => {
        const dateText = el.querySelector('p')?.textContent.trim();
        const linkEl  = el.querySelector('a');
        if (!dateText || !linkEl) return;
        specialDays.push({
          date: new Date(dateText),
          title: linkEl.textContent.trim(),
          url:   linkEl.href
        });
      });
  }

  let memberData = {};
  let initializedElements = new Set();
  let currentCalendarDate = new Date(); 
  let selectedDayEl = null;   
  async function checkMemberLogin() {
    try {
      const member = await memberstack.getCurrentMember();
      return !!member;
    } catch (error) {
      return false;
    }
  }

  function processData(data) {
    return {
      savedItems: data.savedItems || [],
      scheduledItems: data.scheduledItems || {},
      completedItems: data.completedItems || {}
    };
  }
 function fetchSpecialDays() {
    const specialDaysContainer = document.querySelector('[ms-special-days]');
    if (!specialDaysContainer) return [];
    
    const specialDayItems = specialDaysContainer.querySelectorAll('[ms-special-day-date]');
    const specialDays = [];
    
    specialDayItems.forEach(item => {
      const dateString = item.getAttribute('ms-special-day-date');
      if (!dateString) return;
      
      const title = item.querySelector('[ms-special-day-name]')?.textContent || 'Special Day';
      const description = item.querySelector('[ms-special-day-description]')?.textContent || '';
      const url = item.querySelector('a')?.href || item.getAttribute('ms-special-day-url') || '';
      const id = item.getAttribute('ms-special-day-id') || `special-${specialDays.length}`;
      
      try {
        const date = new Date(dateString);
        if (!isNaN(date.getTime())) {
          specialDays.push({
            id,
            date,
            title,
            description,
            url,
            type: 'special' 
          });
        }
      } catch (e) {
        console.error("Error parsing date for special day:", e);
      }
    });
    
    return specialDays;
  }

  function updateSaveButtonVisibility() {
    const saveButtons = document.querySelectorAll('[ms-code-save]');
    const unsaveButtons = document.querySelectorAll('[ms-code-unsave]');

    saveButtons.forEach(button => {
      const itemId = button.getAttribute('ms-code-save');
      button.style.display = !savedItems.includes(itemId) ? 'block' : 'none';
    });

    unsaveButtons.forEach(button => {
      const itemId = button.getAttribute('ms-code-unsave');
      button.style.display = savedItems.includes(itemId) ? 'block' : 'none';
    });
  }

  function updateScheduleButtonVisibility() {
    const scheduleButtons = document.querySelectorAll('[ms-code-schedule]');
    const unscheduleButtons = document.querySelectorAll('[ms-code-unschedule]');
    const doneButtons = document.querySelectorAll('[ms-code-done]');
    const dayTimeDisplays = document.querySelectorAll('[ms-code-schedule-day-time]');
    const dateDisplays = document.querySelectorAll('[ms-code-schedule-date]');

    scheduleButtons.forEach(button => {
      const itemId = button.getAttribute('ms-code-schedule');
      button.style.display = !scheduledItems[itemId] ? 'block' : 'none';
    });

    unscheduleButtons.forEach(button => {
      const itemId = button.getAttribute('ms-code-unschedule');
      button.style.display = (scheduledItems[itemId]) ? 'block' : 'none';
    });
    
    doneButtons.forEach(button => {
      const itemId = button.getAttribute('ms-code-done');
      button.style.display = (scheduledItems[itemId]) ? 'block' : 'none';
    });
    
    dayTimeDisplays.forEach(display => {
      const itemId = display.getAttribute('ms-code-schedule-day-time');
      if (scheduledItems[itemId]) {
        display.style.display = 'block';
        const scheduledDate = new Date(scheduledItems[itemId]);
        display.textContent = formatDayTime(scheduledDate);
      } else {
        display.style.display = 'none';
      }
    });
    
    dateDisplays.forEach(display => {
      const itemId = display.getAttribute('ms-code-schedule-date');
      if (scheduledItems[itemId]) {
        display.style.display = 'block';
        const scheduledDate = new Date(scheduledItems[itemId]);
        display.textContent = formatFullDate(scheduledDate);
      } else {
        display.style.display = 'none';
      }
    });
  }

  function formatDayTime(date) {
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const day = dayNames[date.getDay()];
    
    let hours = date.getHours();
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const ampm = hours >= 12 ? 'pm' : 'am';
    
    hours = hours % 12;
    hours = hours ? hours : 12; 
    
    return `${day} ${hours}:${minutes}${ampm}`;
  }

  function formatFullDate(date) {
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const month = monthNames[date.getMonth()];
    const day = date.getDate();
    const year = date.getFullYear();
    
    let suffix = 'th';
    if (day === 1 || day === 21 || day === 31) suffix = 'st';
    else if (day === 2 || day === 22) suffix = 'nd';
    else if (day === 3 || day === 23) suffix = 'rd';
    
    return `${month} ${day}${suffix}, ${year}`;
  }

  function updateSaveItemVisibility() {
  const saveLists = document.querySelectorAll('[ms-code-save-list]');
  saveLists.forEach(list => {
    const filter = list.getAttribute('ms-code-save-list');
    const items = list.querySelectorAll('[ms-code-save-item]');
    
    if (filter === 'saved') {
      let hasVisibleItems = false;
      
      items.forEach(item => {
        const saveButton = item.querySelector('[ms-code-save]');
        if (!saveButton) {
          item.style.display = 'block';
          hasVisibleItems = true;
          return;
        }
        const itemId = saveButton.getAttribute('ms-code-save');
        
        if (savedItems.includes(itemId)) {
          item.style.display = 'block';
          hasVisibleItems = true;
        } else {
          item.style.display = 'none';
        }
      });
      
      const emptyStateElement = document.querySelector('[ms-code-empty-saved]');
      if (emptyStateElement) {
        emptyStateElement.style.display = hasVisibleItems ? 'none' : 'block';
      }
      
      const defaultEmptyState = list.querySelector('.w-dyn-empty');
      if (defaultEmptyState) {
        defaultEmptyState.style.display = 'none';
      }
    } else {
      items.forEach(item => {
        const saveButton = item.querySelector('[ms-code-save]');
        if (!saveButton) {
          item.style.display = 'block';
          return;
        }
        const itemId = saveButton.getAttribute('ms-code-save');
        
        if (!isLoggedIn || filter === 'all') {
          item.style.display = 'block';
        } else if (filter === 'saved' && savedItems.includes(itemId)) {
          item.style.display = 'block';
        } else if (filter === 'unsaved' && !savedItems.includes(itemId)) {
          item.style.display = 'block';
        } else {
          item.style.display = 'none';
        }
      });
      
      const defaultEmptyState = list.querySelector('.w-dyn-empty');
      if (defaultEmptyState) {
        const hasVisibleItems = Array.from(items).some(item => item.style.display !== 'none');
        defaultEmptyState.style.display = hasVisibleItems ? 'none' : 'block';
      }
    }
  });
}

function updateScheduleItemVisibility() {
    const scheduleLists = document.querySelectorAll('[ms-code-schedule-list]');
    scheduleLists.forEach(list => {
      const filter = list.getAttribute('ms-code-schedule-list');
      
     
      if (filter === 'completed') {
        const templateItems = list.querySelectorAll('[ms-code-schedule-item]');
        let templateItemsById = {};
        
        templateItems.forEach(item => {
          const itemId = item.getAttribute('ms-code-schedule-item');
          if (itemId) {
            if (!templateItemsById[itemId]) {
              templateItemsById[itemId] = [];
            }
            templateItemsById[itemId].push(item);
          }
        });
        
        let hasVisibleItems = false;
        
        templateItems.forEach(item => {
          item.style.display = 'none';
          
          const isClone = item.hasAttribute('data-completion-clone');
          if (isClone && item.parentNode) {
            item.parentNode.removeChild(item);
          }
        });
        
        for (const itemId in completedItems) {
          const completionEntries = completedItems[itemId];
          
          const templates = templateItemsById[itemId];
          
          if (templates && templates.length > 0 && Array.isArray(completionEntries) && completionEntries.length > 0) {
            completionEntries.forEach((completion, index) => {
              const template = templates[0];
              const itemElement = index === 0 ? template : template.cloneNode(true);
              
              if (index > 0) {
                itemElement.setAttribute('data-completion-clone', 'true');
                itemElement.setAttribute('data-completion-index', index);

                template.parentNode.appendChild(itemElement);
              }
              
              const dateElement = itemElement.querySelector('[ms-code-completion-date]');
              if (dateElement && completion.completedDate) {
                const completedDate = new Date(completion.completedDate);
                dateElement.textContent = formatFullDate(completedDate);
                dateElement.style.display = 'block';
              }
              const ratingElement = itemElement.querySelector('[ms-code-completion-rating]');
              if (ratingElement && completion.rating) {
                ratingElement.textContent = `${completion.rating} ★`;
                ratingElement.style.display = 'block';
              }
              
              const notesElement = itemElement.querySelector('[ms-code-completion-notes]');
              if (notesElement && completion.notes) {
                notesElement.textContent = completion.notes;
                notesElement.style.display = 'block';
              }
              
              itemElement.style.display = 'block';
              hasVisibleItems = true;
            });
          }
        }
        
        const emptyStateElement = document.querySelector('[ms-code-empty-completed]');
        if (emptyStateElement) {
          emptyStateElement.style.display = hasVisibleItems ? 'none' : 'block';
        }
        const defaultEmptyState = list.querySelector('.w-dyn-empty');
        if (defaultEmptyState) {
          defaultEmptyState.style.display = 'none';
        }
      } else {
        let hasVisibleItems = false;
        const items = list.querySelectorAll('[ms-code-schedule-item]');
        
        if (filter === 'scheduled') {
          items.forEach(item => {
            const itemId = item.getAttribute('ms-code-schedule-item');
            
            if (itemId && scheduledItems[itemId]) {
              item.style.display = 'block';
              hasVisibleItems = true;
            } else {
              item.style.display = 'none';
            }
          });
          
          const emptyStateElement = document.querySelector('[ms-code-empty-scheduled]');
          if (emptyStateElement) {
            emptyStateElement.style.display = hasVisibleItems ? 'none' : 'block';
          }
          
          const defaultEmptyState = list.querySelector('.w-dyn-empty');
          if (defaultEmptyState) {
            defaultEmptyState.style.display = 'none';
          }
        } else {
          items.forEach(item => {
            const scheduleButton = item.querySelector('[ms-code-schedule]');
            if (!scheduleButton) {
              item.style.display = 'block';
              return;
            }
            const itemId = scheduleButton.getAttribute('ms-code-schedule');
            
            if (!isLoggedIn || filter === 'all') {
              item.style.display = 'block';
              hasVisibleItems = true;
            } else if (filter === 'scheduled' && scheduledItems[itemId]) {
              item.style.display = 'block';
              hasVisibleItems = true;
            } else if (filter === 'unscheduled' && !scheduledItems[itemId]) {
              item.style.display = 'block';
              hasVisibleItems = true;
            } else if (filter === 'upcoming' && scheduledItems[itemId] && new Date(scheduledItems[itemId]) > new Date()) {
              item.style.display = 'block';
              hasVisibleItems = true;
            } else if (filter === 'past' && scheduledItems[itemId] && new Date(scheduledItems[itemId]) <= new Date()) {
              item.style.display = 'block';
              hasVisibleItems = true;
            } else if (filter === 'completed' && completedItems[itemId]) {
              item.style.display = 'block';
              hasVisibleItems = true;
            } else {
              item.style.display = 'none';
            }
          });
          
          const defaultEmptyState = list.querySelector('.w-dyn-empty');
          if (defaultEmptyState) {
            defaultEmptyState.style.display = hasVisibleItems ? 'none' : 'block';
          }
        }
      }
    });
  }

function updateStatusText() {
  const statusElements = document.querySelectorAll('[ms-code-status]');
  statusElements.forEach(statusEl => {
    let itemId = null;
    let parent = statusEl.closest('[ms-code-save],[ms-code-schedule],[ms-code-done]');
    if (parent) {
      itemId = parent.getAttribute('ms-code-save') ||
               parent.getAttribute('ms-code-schedule') ||
               parent.getAttribute('ms-code-done');
    }
    if (!itemId) {
      const saveBtn = statusEl.parentElement.querySelector('[ms-code-save]');
      const scheduleBtn = statusEl.parentElement.querySelector('[ms-code-schedule]');
      const doneBtn = statusEl.parentElement.querySelector('[ms-code-done]');
      itemId = (saveBtn && saveBtn.getAttribute('ms-code-save')) ||
               (scheduleBtn && scheduleBtn.getAttribute('ms-code-schedule')) ||
               (doneBtn && doneBtn.getAttribute('ms-code-done'));
    }
    if (!itemId) return;
    let status = "Not yet saved";
    if (window.completedItems && window.completedItems[itemId] && window.completedItems[itemId].length > 0) {
      status = "Completed";
    } else if (window.scheduledItems && window.scheduledItems[itemId]) {
      status = "Scheduled";
    } else if (window.savedItems && window.savedItems.includes(itemId)) {
      status = "Saved";
    }
    statusEl.textContent = status;
  });
}

window.fsAttributes = window.fsAttributes || [];
window.fsAttributes.push([
  'cmsfilter',
  (filterInstances) => {
    updateStatusText();
    if (window.FsCmsFilter && typeof window.FsCmsFilter.refresh === "function") {
      window.FsCmsFilter.refresh();
    }
  }
]);

  function countItems() {
  const savedCount = savedItems.length;
  
  let scheduledCount = 0;
  for (const itemId in scheduledItems) {
    scheduledCount++;
  }
  
  const completedCount = Object.values(completedItems)
    .reduce((sum, arr) => sum + (Array.isArray(arr) ? arr.length : 1), 0);

  return {
    saved: savedCount,
    scheduled: scheduledCount,
    completed: completedCount
  };
}
  function updateCounterDisplays() {
    const counts = countItems();
    
    const savedCounters = document.querySelectorAll('[ms-code-count-saved]');
    savedCounters.forEach(counter => {
      counter.textContent = counts.saved;
    });
    
    const scheduledCounters = document.querySelectorAll('[ms-code-count-scheduled]');
    scheduledCounters.forEach(counter => {
      counter.textContent = counts.scheduled;
    });
    
    const completedCounters = document.querySelectorAll('[ms-code-count-completed]');
    completedCounters.forEach(counter => {
      counter.textContent = counts.completed;
    });
  }

function updateAllVisibility() {
  updateSaveButtonVisibility();
  updateScheduleButtonVisibility();
  updateSaveItemVisibility();
  updateScheduleItemVisibility();
  updateCounterDisplays();
  updateStatusText(); 
  loadSpecialDays();
  updateCalendar();
}


  async function updateMemberStackData() {
    const updateData = {
      ...memberData,  
      savedItems: savedItems,
      scheduledItems: scheduledItems,
      completedItems: completedItems
    };
    
    try {
      await memberstack.updateMemberJSON({ json: updateData });
    } catch (error) {
      console.error("Error updating member data:", error);
    }
  }

  async function handleSaveButtonClick(event) {
    if (!isLoggedIn) return;

    event.stopPropagation();
    
    const button = event.currentTarget;
    const action = button.getAttribute('ms-code-save') ? 'save' : 'unsave';
    const itemId = button.getAttribute(action === 'save' ? 'ms-code-save' : 'ms-code-unsave');
    
    if (action === 'save' && !savedItems.includes(itemId)) {
      savedItems.push(itemId);
    } else if (action === 'unsave') {
      savedItems = savedItems.filter(id => id !== itemId);
    }

    await updateMemberStackData();
    updateAllVisibility();
  }

function getItemNameBySlug(slug) {
  if (!slug) return "Scheduled Item";
  const els = document.querySelectorAll('[ms-item-name]');
  for (const el of els) {
    if (el.getAttribute('ms-item-name') === slug) {
      return el.textContent.trim();
    }
  }
  return "Scheduled Item";
}

function getItemURLBySlug(slug) {
  const link = document.querySelector(`[ms-item-link="${slug}"]`);
  return link ? link.href : "#";
}


  function createCalendarPopup(itemId, itemTitle = "Item") {
    const overlay = document.createElement('div');
    overlay.className = 'ms-calendar-overlay';
    
    const container = document.createElement('div');
    container.className = 'ms-calendar-container';
    
    const now = new Date();
    const dateString = now.toISOString().split('T')[0];
    const timeString = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    
    const minDate = dateString;
    
    container.innerHTML = `
      <div class="ms-calendar-header">
        <div class="ms-calendar-title">Schedule  your Golden Moment</div>
        <div class="ms-calendar-close">&times;</div>
      </div>
      <div class="ms-calendar-inputs">
        <input type="date" class="ms-calendar-date" min="${minDate}" value="${dateString}">
        <input type="time" class="ms-calendar-time" value="${timeString}">
      </div>
      <div class="ms-calendar-actions">
        <button class="ms-calendar-button ms-calendar-cancel">Cancel</button>
        <button class="ms-calendar-button ms-calendar-save">Schedule</button>
      </div>
    `;
    
    overlay.appendChild(container);
    document.body.appendChild(overlay);
    
    const closeBtn = overlay.querySelector('.ms-calendar-close');
    const cancelBtn = overlay.querySelector('.ms-calendar-cancel');
    const saveBtn = overlay.querySelector('.ms-calendar-save');
    const dateInput = overlay.querySelector('.ms-calendar-date');
    const timeInput = overlay.querySelector('.ms-calendar-time');
    
    closeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      document.body.removeChild(overlay);
    });
    
    cancelBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      document.body.removeChild(overlay);
    });
    
    saveBtn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const selectedDate = dateInput.value;
      const selectedTime = timeInput.value;
      const dateTimeString = `${selectedDate}T${selectedTime}:00`;
      
      scheduledItems[itemId] = dateTimeString;
      await updateMemberStackData();

await sendWebhookEvent({
  name: getItemNameBySlug(itemId),
  action: "scheduled",
  date_scheduled: dateTimeString,
  slug: itemId
});

      
      document.body.removeChild(overlay);
      updateAllVisibility();
    });

    container.addEventListener('click', (e) => {
      e.stopPropagation();
    });
    
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        document.body.removeChild(overlay);
      }
    });
  }

  function createFeedbackPopup(itemId, itemTitle = "Item") {
    const overlay = document.createElement('div');
    overlay.className = 'ms-feedback-overlay';
    
    const container = document.createElement('div');
    container.className = 'ms-feedback-container';
    
    container.innerHTML = `
      <div class="ms-feedback-header">
        <div class="ms-feedback-title">How did you go?</div>
        <div class="ms-feedback-close">&times;</div>
      </div>
      <div class="ms-feedback-form">
        <div class="ms-feedback-field">
          <label class="ms-feedback-label">How would you rate how this went with your community out of five?</label>
          <div class="ms-feedback-stars">
            <span class="ms-star" data-value="1">★</span>
            <span class="ms-star" data-value="2">★</span>
            <span class="ms-star" data-value="3">★</span>
            <span class="ms-star" data-value="4">★</span>
            <span class="ms-star" data-value="5">★</span>
          </div>
        </div>
        <div class="ms-feedback-field">
          <label class="ms-feedback-label">Do you have any notes you'd like to remember in the future?</label>
          <textarea class="ms-feedback-textarea" id="ms-notes"></textarea>
        </div>
        <div class="ms-feedback-field">
          <label class="ms-feedback-label">Were there any moments that brought you unexpected joy in this process?</label>
          <textarea class="ms-feedback-textarea" id="ms-joy"></textarea>
        </div>
        <div class="ms-feedback-field">
          <label class="ms-feedback-label">What did your residents connect with most?</label>
          <textarea class="ms-feedback-textarea" id="ms-connection"></textarea>
        </div>
        <div class="ms-feedback-actions">
          <button class="ms-feedback-button ms-feedback-cancel">Cancel</button>
          <button class="ms-feedback-button ms-feedback-submit">Submit</button>
        </div>
      </div>
    `;
    
    overlay.appendChild(container);
    document.body.appendChild(overlay);
    
    const closeBtn = overlay.querySelector('.ms-feedback-close');
    const cancelBtn = overlay.querySelector('.ms-feedback-cancel');
    const submitBtn = overlay.querySelector('.ms-feedback-submit');
    const stars = overlay.querySelectorAll('.ms-star');
    
    let selectedRating = 0;
    
    stars.forEach(star => {
      star.addEventListener('click', (e) => {
        e.stopPropagation();
        selectedRating = parseInt(star.getAttribute('data-value'));
        
        stars.forEach(s => {
          if (parseInt(s.getAttribute('data-value')) <= selectedRating) {
            s.classList.add('active');
          } else {
            s.classList.remove('active');
          }
        });
      });
      
      star.addEventListener('mouseenter', () => {
        const value = parseInt(star.getAttribute('data-value'));
        stars.forEach(s => {
          if (parseInt(s.getAttribute('data-value')) <= value) {
            s.style.color = '#ffd700';
          }
        });
      });
      
      star.addEventListener('mouseleave', () => {
        stars.forEach(s => {
          if (!s.classList.contains('active')) {
            s.style.color = '#ddd';
          }
        });
      });
    });
    
    closeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      document.body.removeChild(overlay);
    });
    
    cancelBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      document.body.removeChild(overlay);
    });
    
    submitBtn.addEventListener('click', async (e) => {
      e.stopPropagation();
      
      const notes = overlay.querySelector('#ms-notes').value;
      const joy = overlay.querySelector('#ms-joy').value;
      const connection = overlay.querySelector('#ms-connection').value;
      
      const feedback = {
        rating: selectedRating,
        notes: notes,
        joy: joy,
        connection: connection,
        completedDate: new Date().toISOString(),
        originalScheduledDate: scheduledItems[itemId] || null
      };
      
      if (!completedItems[itemId]) {
        completedItems[itemId] = [];
      }
      
      if (Array.isArray(completedItems[itemId])) {
        completedItems[itemId].push(feedback);
      } else {
       
        completedItems[itemId] = [completedItems[itemId], feedback];
      }
      
     
      
      await updateMemberStackData();
await sendWebhookEvent({
  name: getItemNameBySlug(itemId),
  action: "completed",
  date_scheduled: new Date().toISOString(),
  slug: itemId,
  rating: selectedRating,
  notes: notes,
  moments_that_brought_joy: joy,
  residents_connect: connection
});
      delete scheduledItems[itemId];
      document.body.removeChild(overlay);
      updateAllVisibility();
    });
    
   
    container.addEventListener('click', (e) => {
      e.stopPropagation();
    });
    
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        document.body.removeChild(overlay);
      }
    });
  }

  async function handleScheduleButtonClick(event) {
    if (!isLoggedIn) return;

    event.stopPropagation();
    
    const button = event.currentTarget;
    const itemId = button.getAttribute('ms-code-schedule');
    
    if (itemId) {
      const itemTitle = getItemNameBySlug(itemId);
      
      createCalendarPopup(itemId, itemTitle);
    }
  }

  async function handleUnscheduleButtonClick(event) {
    if (!isLoggedIn) return;

    event.stopPropagation();
    
    const button = event.currentTarget;
    const itemId = button.getAttribute('ms-code-unschedule');
    
    if (itemId && scheduledItems[itemId]) {
      await updateMemberStackData();

await sendWebhookEvent({
    name: getItemNameBySlug(itemId),
    action: "unscheduled",
    date_scheduled: scheduledItems[itemId], // This captures the date before deletion
    slug: itemId
  });
     delete scheduledItems[itemId];

      updateAllVisibility();
    }
  }
  
  async function handleDoneButtonClick(event) {
    if (!isLoggedIn) return;

    event.stopPropagation();
    
    const button = event.currentTarget;
    const itemId = button.getAttribute('ms-code-done');
    
    if (itemId) {
      const itemTitle = getItemNameBySlug(itemId);
      
      createFeedbackPopup(itemId, itemTitle);
    }
  }

  function getDaysInMonth(year, month) {
    return new Date(year, month + 1, 0).getDate();
  }
  
  function getFirstDayOfMonth(year, month) {
    return new Date(year, month, 1).getDay();
  }
  
  function getMonthName(month) {
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    return monthNames[month];
  }
  
  function updateCalendar() {
    const calendar = document.querySelector('[ms-code-calendar]');
    if (!calendar) return;
    
    const monthYearDisplay = calendar.querySelector('[ms-code-calendar-month-year]');
    const calendarGrid = calendar.querySelector('[ms-code-calendar-grid]');
    
    if (!monthYearDisplay || !calendarGrid) return;
    
    const year = currentCalendarDate.getFullYear();
    const month = currentCalendarDate.getMonth();
    monthYearDisplay.textContent = `${getMonthName(month)} ${year}`;
  
    calendarGrid.innerHTML = '';
   
    const dayHeaders = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    dayHeaders.forEach(day => {
      const dayHeader = document.createElement('div');
      dayHeader.className = 'calendar-day-header';
      dayHeader.textContent = day;
      calendarGrid.appendChild(dayHeader);
    });
    
    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfMonth(year, month);
    
    for (let i = 0; i < firstDay; i++) {
      const emptyDay = document.createElement('div');
      emptyDay.className = 'calendar-day empty';
      calendarGrid.appendChild(emptyDay);
    }
    
    for (let day = 1; day <= daysInMonth; day++) {
      const dayEl = document.createElement('div');
      dayEl.className = 'calendar-day';
      dayEl.textContent = day;

      const currentDate = new Date(year, month, day);
      const hasScheduledItems = Object.values(scheduledItems).some(dateTimeStr => {
        const scheduledDate = new Date(dateTimeStr);
        return scheduledDate.getFullYear() === year &&
               scheduledDate.getMonth() === month &&
               scheduledDate.getDate() === day;
      });
      
      if (hasScheduledItems) {
        const dot = document.createElement('div');
        dot.className = 'calendar-event-dot';
        dayEl.appendChild(dot);
        dayEl.classList.add('has-events');
      }
      const hasSpecial = specialDays.some(sd =>
        sd.date.getFullYear() === year &&
        sd.date.getMonth()    === month &&
        sd.date.getDate()     === day
      );
      if (hasSpecial) {
        const sdot = document.createElement('div');
        sdot.className = 'calendar-special-dot';
        dayEl.appendChild(sdot);
        dayEl.classList.add('has-special');
      }

      const today = new Date();
      if (today.getFullYear() === year &&
          today.getMonth() === month &&
          today.getDate() === day) {
        dayEl.classList.add('today');
      }
      
    (function(selectedDay) {
      dayEl.addEventListener('click', function() {
        if (selectedDayEl) {
          selectedDayEl.classList.remove('selected');
        }
        dayEl.classList.add('selected');
        selectedDayEl = dayEl;

    
        showScheduledItemsForDay(year, month, selectedDay);
      });
    })(day);
      
      calendarGrid.appendChild(dayEl);
    }
const totalCells = firstDay + daysInMonth;
const trailingEmpties = 42 - totalCells;
for (let i = 0; i < trailingEmpties; i++) {
  const emptyDay = document.createElement('div');
  emptyDay.className = 'calendar-day empty';
  calendarGrid.appendChild(emptyDay);
}
  }

function clickTodayCalendarCell() {
  const calendar = document.querySelector('[ms-code-calendar]');
  if (!calendar) return;
  const grid = calendar.querySelector('[ms-code-calendar-grid]');
  if (!grid) return;
  const todayCell = grid.querySelector('.calendar-day.today');
  if (todayCell) todayCell.click();
}

  
function showScheduledItemsForDay(year, month, day) {
  let dailyView = document.querySelector('[ms-code-daily-schedule]');
  
  if (!dailyView) {
    const calendar = document.querySelector('[ms-code-calendar]');
    if (calendar) {
      dailyView = document.createElement('div');
      dailyView.setAttribute('ms-code-daily-schedule', '');
      dailyView.className = 'daily-schedule-view';
      
      if (calendar.parentNode) {
        calendar.parentNode.insertBefore(dailyView, calendar.nextSibling);
      } else {
        document.body.appendChild(dailyView);
      }
    } else {
      dailyView = document.createElement('div');
      dailyView.setAttribute('ms-code-daily-schedule', '');
      dailyView.className = 'daily-schedule-view';
      document.body.appendChild(dailyView);
    }
  }
  
  dailyView.innerHTML = '';

  const header = document.createElement('div');
  header.className = 'daily-schedule-header';
  header.innerHTML = `<h3>${getMonthName(month)} ${day}, ${year}</h3>`;
    
  dailyView.appendChild(header);
  
  const startOfDay = new Date(year, month, day, 0, 0, 0);
  const endOfDay = new Date(year, month, day, 23, 59, 59);
  
  const scheduledItemsForDay = [];
  
  for (const itemId in scheduledItems) {
    const scheduledDate = new Date(scheduledItems[itemId]);
    if (scheduledDate >= startOfDay && scheduledDate <= endOfDay) {
      scheduledItemsForDay.push({
        id: itemId,
        date: scheduledDate
      });
    }
  }
  
  scheduledItemsForDay.sort((a, b) => a.date - b.date);

const specialsForDay = specialDays.filter(sd =>
  sd.date.getFullYear() === year &&
  sd.date.getMonth()    === month &&
  sd.date.getDate()     === day
);

 if (scheduledItemsForDay.length > 0 || specialsForDay.length > 0) {
  const itemsList = document.createElement('div');
  itemsList.className = 'daily-schedule-items';

  scheduledItemsForDay.forEach(item => {
    const url   = getItemURLBySlug(item.id);
    const hrs   = item.date.getHours();
    const mins  = String(item.date.getMinutes()).padStart(2,'0');
    const ampm  = hrs >= 12 ? 'pm':'am';
    const dispH = hrs % 12 || 12;

    const itemEl = document.createElement('div');
    itemEl.className = 'daily-schedule-item';
    itemEl.innerHTML = `
      <div class="daily-schedule-time">${dispH}:${mins}${ampm}</div>
      <div class="daily-schedule-title">${getItemNameBySlug(item.id)}</div>
      <div class="daily-schedule-actions">
        <button class="daily-schedule-unschedule" data-item-id="${item.id}">Unschedule</button>
        <button class="daily-schedule-done"       data-item-id="${item.id}">Mark Done</button>
        <a class="daily-schedule-more" href="${url}" target="_blank">Find Out More</a>
      </div>`;
    itemsList.appendChild(itemEl);
  });

  specialsForDay.forEach(sd => {
    const specialEl = document.createElement('div');
    specialEl.className = 'daily-schedule-item special';
    specialEl.innerHTML = `
      <div class="daily-schedule-time">All Day</div>
      <div class="daily-schedule-title">${sd.title}</div>
      <div class="daily-schedule-actions">
        <a class="daily-schedule-more" href="${sd.url}" target="_blank">Find Out More</a>
      </div>`;
    itemsList.appendChild(specialEl);
  });

  dailyView.appendChild(itemsList);
   
dailyView.querySelectorAll('.daily-schedule-unschedule')
  .forEach(btn => btn.addEventListener('click', async e => {
    e.stopPropagation();
    const id = btn.dataset.itemId;
    const scheduledDate = scheduledItems[id];
    
    await sendWebhookEvent({
      name: getItemNameBySlug(id),
      action: "unscheduled",
      date_scheduled: scheduledDate,
      slug: id
    });
    
    delete scheduledItems[id];
    await updateMemberStackData();
    showScheduledItemsForDay(year, month, day);
  }));

  dailyView.querySelectorAll('.daily-schedule-done')
    .forEach(btn => btn.addEventListener('click', e => {
      e.stopPropagation();
      createFeedbackPopup(btn.dataset.itemId);
    }));
} else {
  const noItems = document.createElement('div');
  noItems.className = 'daily-schedule-no-items';
  noItems.textContent = 'Nothing scheduled on this day.';
  dailyView.appendChild(noItems);
}
  
  dailyView.style.display = 'block';
}

  function addClickListeners() {
    const saveButtons = document.querySelectorAll('[ms-code-save]');
    const unsaveButtons = document.querySelectorAll('[ms-code-unsave]');
    
    saveButtons.forEach(button => {
      if (!initializedElements.has(button)) {
        button.addEventListener('click', handleSaveButtonClick);
        initializedElements.add(button);
      }
    });
    
    unsaveButtons.forEach(button => {
      if (!initializedElements.has(button)) {
        button.addEventListener('click', handleSaveButtonClick);
        initializedElements.add(button);
      }
    });

    const scheduleButtons = document.querySelectorAll('[ms-code-schedule]');
    const unscheduleButtons = document.querySelectorAll('[ms-code-unschedule]');
    const doneButtons = document.querySelectorAll('[ms-code-done]');
    
    scheduleButtons.forEach(button => {
      if (!initializedElements.has(button)) {
        button.addEventListener('click', handleScheduleButtonClick);
        initializedElements.add(button);
      }
    });
    
    unscheduleButtons.forEach(button => {
      if (!initializedElements.has(button)) {
        button.addEventListener('click', handleUnscheduleButtonClick);
        initializedElements.add(button);
      }
    });
    
    doneButtons.forEach(button => {
      if (!initializedElements.has(button)) {
        button.addEventListener('click', handleDoneButtonClick);
        initializedElements.add(button);
      }
    });

    const prevMonthBtn = document.querySelector('[ms-code-calendar-prev-month]');
    const nextMonthBtn = document.querySelector('[ms-code-calendar-next-month]');
    const todayBtn = document.querySelector('[ms-code-calendar-today]');
    
    if (prevMonthBtn && !initializedElements.has(prevMonthBtn)) {
      prevMonthBtn.addEventListener('click', () => {
        currentCalendarDate.setMonth(currentCalendarDate.getMonth() - 1);
        updateCalendar();
      });
      initializedElements.add(prevMonthBtn);
    }
    
    if (nextMonthBtn && !initializedElements.has(nextMonthBtn)) {
      nextMonthBtn.addEventListener('click', () => {
        currentCalendarDate.setMonth(currentCalendarDate.getMonth() + 1);
        updateCalendar();
      });
      initializedElements.add(nextMonthBtn);
    }
    
    if (todayBtn && !initializedElements.has(todayBtn)) {
      todayBtn.addEventListener('click', () => {
        currentCalendarDate = new Date();
        updateCalendar();
      });
      initializedElements.add(todayBtn);
    }
  }

  async function initializeScript() {
    isLoggedIn = await checkMemberLogin();

    if (isLoggedIn) {
      try {
        const result = await memberstack.getMemberJSON();
        memberData = result.data || {}; 
        const processedData = processData(memberData);
        savedItems = processedData.savedItems;
        scheduledItems = processedData.scheduledItems;
        completedItems = processedData.completedItems;
        
        for (const itemId in completedItems) {
          if (!Array.isArray(completedItems[itemId])) {
            completedItems[itemId] = [completedItems[itemId]];
          }
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      }
    }

    updateAllVisibility();
  loadSpecialDays();          
addClickListeners();
clickTodayCalendarCell();
    const observer = new MutationObserver((mutations) => {
      let shouldUpdate = false;
      
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
          mutation.addedNodes.forEach(node => {
            if (node.nodeType === 1) { 
              if (node.querySelector && (
                  node.querySelector('[ms-code-save]') || 
                  node.querySelector('[ms-code-unsave]') ||
                  node.querySelector('[ms-code-schedule]') ||
                  node.querySelector('[ms-code-unschedule]') ||
                  node.querySelector('[ms-code-done]') ||
                  node.querySelector('[ms-code-count-saved]') ||
                  node.querySelector('[ms-code-count-scheduled]') ||
                  node.querySelector('[ms-code-count-completed]') ||
                  node.querySelector('[ms-code-empty-scheduled]') ||
                  node.querySelector('[ms-code-empty-completed]') ||
                  node.querySelector('[ms-code-calendar]')
                )) {
                shouldUpdate = true;
              }
            }
          });
        }
      });
      
      if (shouldUpdate) {
        updateAllVisibility();
        addClickListeners();
const now = new Date();
showScheduledItemsForDay(now.getFullYear(), now.getMonth(), now.getDate());

      }
    });

    const observerConfig = { 
      childList: true, 
      subtree: true,
      attributes: true,
      attributeFilter: [
        'ms-code-save', 
        'ms-code-unsave', 
        'ms-code-schedule', 
        'ms-code-unschedule', 
        'ms-code-done',
        'ms-code-count-saved',
        'ms-code-count-scheduled',
        'ms-code-count-completed',
        'ms-code-empty-scheduled',
        'ms-code-empty-completed',
        'ms-code-calendar',
        'ms-code-calendar-month-year',
        'ms-code-calendar-grid',
        'ms-code-calendar-prev-month',
        'ms-code-calendar-next-month',
        'ms-code-calendar-today',
        'ms-code-daily-schedule'
      ]
    };

    observer.observe(document.body, observerConfig);
  }

  initializeScript();
});
</script>

