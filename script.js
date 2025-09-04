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
  let recurringEvents = {};


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
  // Migrate old scheduledItems format to new object format
  let processedScheduledItems = {};
  if (data.scheduledItems) {
    for (const [itemId, value] of Object.entries(data.scheduledItems)) {
      if (typeof value === 'string') {
        // Old format - convert to new
        processedScheduledItems[itemId] = {
          datetime: value,
          location: '',
          type: 'regular'
        };
      } else {
        // Already new format
        processedScheduledItems[itemId] = value;
      }
    }
  }
  
  return {
    savedItems: data.savedItems || [],
    scheduledItems: processedScheduledItems,
    completedItems: data.completedItems || {},
    recurringEvents: data.recurringEvents || {}
  };
}

function checkTimeConflict(startDateTime, endDateTime, excludeItemId = null) {
  const startTime = new Date(startDateTime);
  const endTime = new Date(endDateTime);
  
  // Check regular scheduled items
  for (const [itemId, itemData] of Object.entries(scheduledItems)) {
    if (excludeItemId && itemId === excludeItemId) continue;
    
    const itemStart = new Date(itemData.datetime);
    const itemEnd = new Date(itemStart.getTime() + (2 * 60 * 60 * 1000)); // 2 hours default
    
    if ((startTime < itemEnd) && (endTime > itemStart)) {
      return {
        conflict: true,
        conflictWith: getItemNameBySlug(itemId),
        type: 'regular'
      };
    }
  }
  
  // Check recurring events
  for (const [eventId, eventData] of Object.entries(recurringEvents)) {
    if (excludeItemId && eventId === excludeItemId) continue;
    
    const instances = generateRecurringInstances(eventData, startTime, endTime);
    for (const instance of instances) {
      const instanceStart = new Date(instance.datetime);
      const instanceEnd = new Date(instance.endTime);
      
      if ((startTime < instanceEnd) && (endTime > instanceStart)) {
        return {
          conflict: true,
          conflictWith: eventData.title,
          type: 'recurring'
        };
      }
    }
  }
  
  return { conflict: false };
}

function generateRecurringInstances(eventData, startRange, endRange) {
  const instances = [];
  const current = new Date(startRange);
  current.setDate(current.getDate() - 7); // Start a week before range
  
  while (current <= endRange) {
    const [hours, minutes] = eventData.time.split(':').map(Number);
    const instanceStart = new Date(current);
    instanceStart.setHours(hours, minutes, 0, 0);
    
    const [endHours, endMinutes] = eventData.endTime.split(':').map(Number);
    const instanceEnd = new Date(current);
    instanceEnd.setHours(endHours, endMinutes, 0, 0);
    
    if (instanceStart >= startRange && instanceStart <= endRange) {
      instances.push({
        id: eventData.id,
        title: eventData.title,
        location: eventData.location,
        datetime: instanceStart.toISOString(),
        endTime: instanceEnd.toISOString(),
        type: 'recurring'
      });
    }
    
    current.setDate(current.getDate() + 1); // Daily recurrence
  }
  
  return instances;
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
    const scheduledDate = new Date(scheduledItems[itemId].datetime);
    display.textContent = formatDayTime(scheduledDate);
  } else {
    display.style.display = 'none';
  }
});
    
    dateDisplays.forEach(display => {
     const itemId = display.getAttribute('ms-code-schedule-date');
     if (scheduledItems[itemId]) {
       display.style.display = 'block';
       const scheduledDate = new Date(scheduledItems[itemId].datetime);
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
 	  completedItems: completedItems,
	  recurringEvents: recurringEvents
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

 
 function createCalendarPopup(itemId, itemTitle = "Item", isRecurring = false) {
  const overlay = document.createElement('div');
  overlay.className = 'ms-calendar-overlay';
  
  const container = document.createElement('div');
  container.className = 'ms-calendar-container';
  
  const now = new Date();
  const dateString = now.toISOString().split('T')[0];
  const timeString = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  const endTimeString = `${String(now.getHours() + 2).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  
  const minDate = dateString;
  
  container.innerHTML = `
    <div class="ms-calendar-header">
      <div class="ms-calendar-title">${isRecurring ? 'Create Recurring Event' : 'Schedule your Golden Moment'}</div>
      <div class="ms-calendar-close">&times;</div>
    </div>
    <div class="ms-calendar-inputs">
      ${isRecurring ? `
        <input type="text" class="ms-calendar-title-input" placeholder="Event title" required>
        <input type="time" class="ms-calendar-time" value="${timeString}">
        <input type="time" class="ms-calendar-end-time" value="${endTimeString}">
      ` : `
        <input type="date" class="ms-calendar-date" min="${minDate}" value="${dateString}">
        <input type="time" class="ms-calendar-time" value="${timeString}">
      `}
      <input type="text" class="ms-calendar-location" placeholder="Location (optional)">
    </div>
    <div class="ms-calendar-conflict-message" style="display: none; color: red; margin: 10px 0;"></div>
    <div class="ms-calendar-actions">
      <button class="ms-calendar-button ms-calendar-cancel">Cancel</button>
      <button class="ms-calendar-button ms-calendar-save">${isRecurring ? 'Create' : 'Schedule'}</button>
    </div>
  `;
  
  overlay.appendChild(container);
  document.body.appendChild(overlay);
  
  const closeBtn = overlay.querySelector('.ms-calendar-close');
  const cancelBtn = overlay.querySelector('.ms-calendar-cancel');
  const saveBtn = overlay.querySelector('.ms-calendar-save');
  const dateInput = overlay.querySelector('.ms-calendar-date');
  const timeInput = overlay.querySelector('.ms-calendar-time');
  const endTimeInput = overlay.querySelector('.ms-calendar-end-time');
  const locationInput = overlay.querySelector('.ms-calendar-location');
  const titleInput = overlay.querySelector('.ms-calendar-title-input');
  const conflictMessage = overlay.querySelector('.ms-calendar-conflict-message');
  
  // Conflict checking function
  function checkForConflicts() {
    if (isRecurring) {
      // For recurring events, check next 30 days for conflicts
      const startDate = new Date();
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + 30);
      
      const [hours, minutes] = timeInput.value.split(':').map(Number);
      const [endHours, endMinutes] = endTimeInput.value.split(':').map(Number);
      
      const current = new Date(startDate);
      while (current <= endDate) {
        const testStart = new Date(current);
        testStart.setHours(hours, minutes, 0, 0);
        const testEnd = new Date(current);
        testEnd.setHours(endHours, endMinutes, 0, 0);
        
        const conflict = checkTimeConflict(testStart.toISOString(), testEnd.toISOString());
        if (conflict.conflict) {
          conflictMessage.textContent = `This recurring time conflicts with "${conflict.conflictWith}" on ${testStart.toLocaleDateString()}. Please select another time or remove the conflicting item.`;
          conflictMessage.style.display = 'block';
          return false;
        }
        
        current.setDate(current.getDate() + 1);
      }
    } else {
      const selectedDate = dateInput.value;
      const selectedTime = timeInput.value;
      const startDateTime = `${selectedDate}T${selectedTime}:00`;
      const startTime = new Date(startDateTime);
      const endTime = new Date(startTime.getTime() + (2 * 60 * 60 * 1000)); // 2 hours
      
      const conflict = checkTimeConflict(startDateTime, endTime.toISOString(), itemId);
      if (conflict.conflict) {
        conflictMessage.textContent = `This time is already booked with "${conflict.conflictWith}". Please select another time or remove the current item from your schedule.`;
        conflictMessage.style.display = 'block';
        return false;
      }
    }
    
    conflictMessage.style.display = 'none';
    return true;
  }
  
  // Add event listeners for conflict checking
  if (dateInput) dateInput.addEventListener('change', checkForConflicts);
  timeInput.addEventListener('change', checkForConflicts);
  if (endTimeInput) endTimeInput.addEventListener('change', checkForConflicts);
  
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
    
    if (!checkForConflicts()) {
      return; // Don't save if there are conflicts
    }
    
    if (isRecurring) {
      const title = titleInput.value.trim();
      if (!title) {
        alert('Please enter a title for the recurring event.');
        return;
      }
      
      const eventId = 'recurring_' + Date.now();
      recurringEvents[eventId] = {
        id: eventId,
        title: title,
        time: timeInput.value,
        endTime: endTimeInput.value,
        location: locationInput.value.trim(),
        pattern: 'daily'
      };
      
      await updateMemberStackData();
      await sendWebhookEvent({
        name: title,
        action: "recurring_created",
        time: timeInput.value,
        end_time: endTimeInput.value,
        location: locationInput.value.trim(),
        pattern: 'daily'
      });
      
    } else {
      const selectedDate = dateInput.value;
      const selectedTime = timeInput.value;
      const dateTimeString = `${selectedDate}T${selectedTime}:00`;
      const location = locationInput.value.trim();
      
      scheduledItems[itemId] = {
        datetime: dateTimeString,
        location: location,
        type: 'regular'
      };
      
      await updateMemberStackData();
      await sendWebhookEvent({
        name: getItemNameBySlug(itemId),
        action: "scheduled",
        date_scheduled: dateTimeString,
        location: location,
        slug: itemId
      });
    }
    
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


  async function handleUnscheduleButtonClick(event) {
  if (!isLoggedIn) return;

  event.stopPropagation();
  
  const button = event.currentTarget;
  const itemId = button.getAttribute('ms-code-unschedule');
  
  if (itemId && scheduledItems[itemId]) {
    const scheduledData = scheduledItems[itemId];
    
    await sendWebhookEvent({
      name: getItemNameBySlug(itemId),
      action: "unscheduled",
      date_scheduled: scheduledData.datetime,
      location: scheduledData.location,
      slug: itemId
    });
    
    delete scheduledItems[itemId];
    await updateMemberStackData();
    updateAllVisibility();
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
  
  async function handleCreateRecurringButtonClick(event) {
  if (!isLoggedIn) return;
  
  event.stopPropagation();
  createCalendarPopup(null, "Recurring Event", true);
}

async function handleEditRecurringButtonClick(event) {
  if (!isLoggedIn) return;
  
  event.stopPropagation();
  
  const button = event.currentTarget;
  const eventId = button.getAttribute('ms-code-edit-recurring');
  
  if (eventId && recurringEvents[eventId]) {
    // Create edit popup for recurring event
    createRecurringEditPopup(eventId);
  }
}

function createRecurringEditPopup(eventId) {
  const eventData = recurringEvents[eventId];
  const overlay = document.createElement('div');
  overlay.className = 'ms-calendar-overlay';
  
  const container = document.createElement('div');
  container.className = 'ms-calendar-container';
  
  container.innerHTML = `
    <div class="ms-calendar-header">
      <div class="ms-calendar-title">Edit Recurring Event</div>
      <div class="ms-calendar-close">&times;</div>
    </div>
    <div class="ms-calendar-inputs">
      <input type="text" class="ms-calendar-title-input" value="${eventData.title}" required>
      <input type="time" class="ms-calendar-time" value="${eventData.time}">
      <input type="time" class="ms-calendar-end-time" value="${eventData.endTime}">
      <input type="text" class="ms-calendar-location" value="${eventData.location}" placeholder="Location (optional)">
    </div>
    <div class="ms-calendar-actions">
      <button class="ms-calendar-button ms-calendar-delete" style="background-color: #dc3545;">Delete</button>
      <button class="ms-calendar-button ms-calendar-cancel">Cancel</button>
      <button class="ms-calendar-button ms-calendar-save">Update</button>
    </div>
  `;
  
  overlay.appendChild(container);
  document.body.appendChild(overlay);
  
  const closeBtn = overlay.querySelector('.ms-calendar-close');
  const cancelBtn = overlay.querySelector('.ms-calendar-cancel');
  const saveBtn = overlay.querySelector('.ms-calendar-save');
  const deleteBtn = overlay.querySelector('.ms-calendar-delete');
  const titleInput = overlay.querySelector('.ms-calendar-title-input');
  const timeInput = overlay.querySelector('.ms-calendar-time');
  const endTimeInput = overlay.querySelector('.ms-calendar-end-time');
  const locationInput = overlay.querySelector('.ms-calendar-location');
  
  closeBtn.addEventListener('click', () => document.body.removeChild(overlay));
  cancelBtn.addEventListener('click', () => document.body.removeChild(overlay));
  
  deleteBtn.addEventListener('click', async () => {
    if (confirm('Are you sure you want to delete this recurring event?')) {
      delete recurringEvents[eventId];
      await updateMemberStackData();
      await sendWebhookEvent({
        name: eventData.title,
        action: "recurring_deleted",
        event_id: eventId
      });
      document.body.removeChild(overlay);
      updateAllVisibility();
    }
  });
  
  saveBtn.addEventListener('click', async () => {
    const title = titleInput.value.trim();
    if (!title) {
      alert('Please enter a title for the event.');
      return;
    }
    
    recurringEvents[eventId] = {
      ...eventData,
      title: title,
      time: timeInput.value,
      endTime: endTimeInput.value,
      location: locationInput.value.trim()
    };
    
    await updateMemberStackData();
    await sendWebhookEvent({
      name: title,
      action: "recurring_updated",
      event_id: eventId,
      time: timeInput.value,
      end_time: endTimeInput.value,
      location: locationInput.value.trim()
    });
    
    document.body.removeChild(overlay);
    updateAllVisibility();
  });
  
  container.addEventListener('click', (e) => e.stopPropagation());
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) document.body.removeChild(overlay);
  });
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
      const hasScheduledItems = Object.values(scheduledItems).some(itemData => {
  const scheduledDate = new Date(itemData.datetime);
  return scheduledDate.getFullYear() === year &&
         scheduledDate.getMonth() === month &&
         scheduledDate.getDate() === day;
});

// Check for recurring events on this day
const hasRecurringEvents = Object.values(recurringEvents).some(eventData => {
  const [hours, minutes] = eventData.time.split(':').map(Number);
  const eventDate = new Date(year, month, day, hours, minutes, 0);
  return eventDate.getFullYear() === year &&
         eventDate.getMonth() === month &&
         eventDate.getDate() === day;
});

if (hasScheduledItems || hasRecurringEvents) {
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
  header.innerHTML = `
    <h3>${getMonthName(month)} ${day}, ${year}</h3>
    <button class="ms-create-recurring-btn" style="margin-left: 10px; padding: 5px 10px; background: #007bff; color: white; border: none; border-radius: 3px; cursor: pointer;">+ Create Recurring Event</button>
  `;
  dailyView.appendChild(header);
  
  // Add event listener for create recurring button
  header.querySelector('.ms-create-recurring-btn').addEventListener('click', handleCreateRecurringButtonClick);
  
  const startOfDay = new Date(year, month, day, 0, 0, 0);
  const endOfDay = new Date(year, month, day, 23, 59, 59);
  
  const scheduledItemsForDay = [];
  const recurringItemsForDay = [];
  
  // Get regular scheduled items
  for (const itemId in scheduledItems) {
    const scheduledDate = new Date(scheduledItems[itemId].datetime);
    if (scheduledDate >= startOfDay && scheduledDate <= endOfDay) {
      scheduledItemsForDay.push({
        id: itemId,
        date: scheduledDate,
        location: scheduledItems[itemId].location || '',
        type: 'regular'
      });
    }
  }
  
  // Get recurring events for this day
  for (const eventId in recurringEvents) {
    const eventData = recurringEvents[eventId];
    const [hours, minutes] = eventData.time.split(':').map(Number);
    const eventDateTime = new Date(year, month, day, hours, minutes, 0);
    
    if (eventDateTime >= startOfDay && eventDateTime <= endOfDay) {
      recurringItemsForDay.push({
        id: eventId,
        date: eventDateTime,
        title: eventData.title,
        location: eventData.location || '',
        endTime: eventData.endTime,
        type: 'recurring'
      });
    }
  }
  
  // Combine and sort all items
  const allItems = [...scheduledItemsForDay, ...recurringItemsForDay];
  allItems.sort((a, b) => a.date - b.date);

  const specialsForDay = specialDays.filter(sd =>
    sd.date.getFullYear() === year &&
    sd.date.getMonth() === month &&
    sd.date.getDate() === day
  );

  if (allItems.length > 0 || specialsForDay.length > 0) {
    const itemsList = document.createElement('div');
    itemsList.className = 'daily-schedule-items';

    allItems.forEach(item => {
      const hrs = item.date.getHours();
      const mins = String(item.date.getMinutes()).padStart(2, '0');
      const ampm = hrs >= 12 ? 'pm' : 'am';
      const dispH = hrs % 12 || 12;
      
      const itemEl = document.createElement('div');
      itemEl.className = 'daily-schedule-item';
      
      if (item.type === 'regular') {
        const url = getItemURLBySlug(item.id);
        itemEl.innerHTML = `
          <div class="daily-schedule-time">${dispH}:${mins}${ampm}</div>
          <div class="daily-schedule-title">${getItemNameBySlug(item.id)}</div>
          ${item.location ? `<div class="daily-schedule-location">📍 ${item.location}</div>` : ''}
          <div class="daily-schedule-actions">
            <button class="daily-schedule-unschedule" data-item-id="${item.id}">Unschedule</button>
            <button class="daily-schedule-done" data-item-id="${item.id}">Mark Done</button>
            <a class="daily-schedule-more" href="${url}" target="_blank">Find Out More</a>
          </div>`;
      } else {
        // Recurring event
        const [endHrs, endMins] = item.endTime.split(':').map(Number);
        const endAmpm = endHrs >= 12 ? 'pm' : 'am';
        const endDispH = endHrs % 12 || 12;
        
        itemEl.innerHTML = `
          <div class="daily-schedule-time">${dispH}:${mins}${ampm} - ${endDispH}:${String(endMins).padStart(2,'0')}${endAmpm}</div>
          <div class="daily-schedule-title">${item.title}</div>
          ${item.location ? `<div class="daily-schedule-location">📍 ${item.location}</div>` : ''}
          <div class="daily-schedule-actions">
            <button class="daily-schedule-edit-recurring" data-event-id="${item.id}">Edit Event</button>
          </div>`;
      }
      
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
    
    // Add event listeners
    dailyView.querySelectorAll('.daily-schedule-unschedule')
      .forEach(btn => btn.addEventListener('click', async e => {
        e.stopPropagation();
        const id = btn.dataset.itemId;
        const scheduledData = scheduledItems[id];
        
        await sendWebhookEvent({
          name: getItemNameBySlug(id),
          action: "unscheduled",
          date_scheduled: scheduledData.datetime,
          location: scheduledData.location,
          slug: id
        });
        
        delete scheduledItems[id];
        await updateMemberStackData();
        showScheduledItemsForDay(year, month, day);
        updateAllVisibility();
      }));

    dailyView.querySelectorAll('.daily-schedule-done')
      .forEach(btn => btn.addEventListener('click', e => {
        e.stopPropagation();
        createFeedbackPopup(btn.dataset.itemId);
      }));

    dailyView.querySelectorAll('.daily-schedule-edit-recurring')
      .forEach(btn => btn.addEventListener('click', e => {
        e.stopPropagation();
        createRecurringEditPopup(btn.dataset.eventId);
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
				recurringEvents = processedData.recurringEvents;
        
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

