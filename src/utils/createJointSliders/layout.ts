import type { TabsResult } from './types';

const TAB_BASE_CLASSES = 'px-3 py-1 text-xs sm:text-sm rounded border bg-gray-50 text-gray-800 transition-colors cursor-pointer';

export function setupPanels(container: HTMLElement, containerId: string): TabsResult {
  container.innerHTML = '';

  const externalTabContainer =
    document.getElementById(`${containerId}-tabs`) || document.getElementById('joint-tab-container');
  if (externalTabContainer) {
    externalTabContainer.innerHTML = '';
  }

  const tabList = document.createElement('div');
  tabList.className = 'flex gap-2';

  const positionTab = document.createElement('button');
  positionTab.type = 'button';
  positionTab.textContent = 'Position';
  positionTab.className = `${TAB_BASE_CLASSES} border-black`;

  const jointTab = document.createElement('button');
  jointTab.type = 'button';
  jointTab.textContent = 'Joint Angles';
  jointTab.className = `${TAB_BASE_CLASSES} border-gray-300`;

  tabList.appendChild(positionTab);
  tabList.appendChild(jointTab);

  if (externalTabContainer) {
    externalTabContainer.appendChild(tabList);
  } else {
    const fallbackTabsWrapper = document.createElement('div');
    fallbackTabsWrapper.className = 'flex justify-end mb-2';
    fallbackTabsWrapper.appendChild(tabList);
    container.appendChild(fallbackTabsWrapper);
  }

  const panelsWrapper = document.createElement('div');
  panelsWrapper.className = 'mt-2 flex flex-col gap-3';

  const positionPanel = document.createElement('div');
  positionPanel.className = 'flex flex-col gap-3';

  const jointPanel = document.createElement('div');
  jointPanel.className = 'flex flex-col gap-3 hidden';

  panelsWrapper.appendChild(positionPanel);
  panelsWrapper.appendChild(jointPanel);
  container.appendChild(panelsWrapper);

  function setActive(target: 'position' | 'joint') {
    if (target === 'position') {
      positionTab.classList.remove('border-gray-300');
      positionTab.classList.add('border-black');
      jointTab.classList.remove('border-black');
      jointTab.classList.add('border-gray-300');
      positionPanel.classList.remove('hidden');
      jointPanel.classList.add('hidden');
    } else {
      jointTab.classList.remove('border-gray-300');
      jointTab.classList.add('border-black');
      positionTab.classList.remove('border-black');
      positionTab.classList.add('border-gray-300');
      jointPanel.classList.remove('hidden');
      positionPanel.classList.add('hidden');
    }
  }

  positionTab.addEventListener('click', () => setActive('position'));
  jointTab.addEventListener('click', () => setActive('joint'));

  // initialize default state
  setActive('position');

  return { positionPanel, jointPanel };
}
