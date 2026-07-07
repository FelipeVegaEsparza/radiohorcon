import { 
  getBasicData, 
  buildImageUrl, 
  getPrograms, 
  getNews, 
  getVideos, 
  getPodcasts, 
  getVideocasts, 
  getSponsors, 
  getPromotions, 
  getSocialNetworks,
  getGalleries,
  getCurrentSong
} from '/assets/js/api.js';

class RadioStreamApp {
  constructor() {
    this.currentView = 'now-playing';
    this.audioPlayer = null;
    this.isPlaying = false;
    this.currentVolume = 50;
    this.sonicPanelInterval = null;
    this.currentSongData = null;
    this.navigationSetup = false; // Flag to prevent multiple setups
    
    this.init();
  }

  async init() {
    try {
      // Setup navigation FIRST - before loading content
      this.setupNavigation();
      
      await this.loadBasicData();
      await this.loadAllContent();
      
      this.setupAudioPlayer();
      this.setupModalEventListeners();
      
      await this.loadSonicPanelData();
      this.startSonicPanelUpdates();
    } catch (error) {
      console.error('Template3: Error initializing stream app:', error);
    }
    
    // Fallback de emergencia: ocultar loading después de 8 segundos si aún está visible
    setTimeout(() => {
      const overlay = document.getElementById('loading-overlay');
      if (overlay && overlay.classList.contains('active')) {
        console.log('Template3: Fallback - Ocultando loading');
        if (window.loadingManager) {
          window.loadingManager.forceHide();
        } else {
          overlay.classList.remove('active');
        }
      }
    }, 8000);
  }

  showLoading() {
    document.getElementById('loading-overlay').classList.add('active');
  }

  hideLoading() {
    document.getElementById('loading-overlay').classList.remove('active');
  }

  async loadBasicData() {
    try {
      const data = await getBasicData();
      const logoUrl = await buildImageUrl(data.logoUrl);
      
      // Update sidebar branding
      const sidebarLogo = document.getElementById('sidebar-logo');
      const logoPlaceholder = document.querySelector('.logo-placeholder');
      
      if (sidebarLogo && logoUrl) {
        sidebarLogo.src = logoUrl;
        sidebarLogo.style.display = 'block';
        if (logoPlaceholder) logoPlaceholder.style.display = 'none';
      }
      
      // Store streaming URL
      this.streamUrl = data.radioStreamingUrl;
      
      // Load social networks
      await this.loadSocialNetworks();
      
    } catch (error) {
      console.error('Error loading basic data:', error);
    }
  }

  async loadAllContent() {
    // Load content for all views
    console.log('Template3: Starting to load all content...');
    
    try {
      await Promise.all([
        this.loadPrograms(),
        this.loadNews(),

        this.loadPodcasts(),
        this.loadVideocasts(),
        this.loadSponsors(),
        this.loadPromotions(),
        this.loadGalleries(),
      ]);
      console.log('Template3: All content loaded successfully');
    } catch (error) {
      console.error('Template3: Error loading content:', error);
    }
  }

  async loadPrograms() {
    try {
      console.log('Template3: Loading programs...');
      const programs = await getPrograms();
      console.log('Template3: Programs received:', programs);
      
      if (programs && programs.length > 0) {
        // Group programs by day
        const programsByDay = this.groupProgramsByDay(programs);
        
        // Load programs for each day
        this.loadProgramsForAllDays(programsByDay);
        
        // Setup tabs functionality
        this.setupProgramsTabs();
        
        // Set current day as active
        this.setCurrentDayActive();
        
      } else {
        this.showNoProgramsMessage();
      }
    } catch (error) {
      console.error('Error loading programs:', error);
      this.showProgramsError();
    }
  }

  groupProgramsByDay(programs) {
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    const programsByDay = {};
    
    days.forEach(day => {
      programsByDay[day] = programs.filter(program => 
        program.weekDays && program.weekDays.includes(day)
      );
    });
    
    return programsByDay;
  }

  loadProgramsForAllDays(programsByDay) {
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    
    days.forEach(day => {
      const container = document.querySelector(`#${day}-programs .programs-timeline`);
      const dayPrograms = programsByDay[day];
      
      if (container && dayPrograms && dayPrograms.length > 0) {
        const html = dayPrograms.map(program => `
          <div class="program-card">
            ${program.imageUrl ? `<img src="https://dashboard.ipstream.cl${program.imageUrl}" alt="${program.name}">` : ''}
            <div class="program-info">
              <h3>${program.name}</h3>
              <p>${program.description || 'Sin descripción disponible'}</p>
              <div class="program-schedule">
                <span><i class="fas fa-clock"></i> ${program.startTime} - ${program.endTime}</span>
              </div>
            </div>
          </div>
        `).join('');
        
        container.innerHTML = html;
      } else if (container) {
        container.innerHTML = '<p>No hay programas para este día</p>';
      }
    });
  }

  setupProgramsTabs() {
    document.querySelectorAll('.programs-tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const day = btn.dataset.day;
        this.showProgramsDay(day);
        
        // Update active tab
        document.querySelectorAll('.programs-tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
      });
    });
  }

  showProgramsDay(day) {
    // Hide all day contents
    document.querySelectorAll('.programs-day-content').forEach(content => {
      content.classList.remove('active');
    });
    
    // Show selected day content
    const dayContent = document.getElementById(`${day}-programs`);
    if (dayContent) {
      dayContent.classList.add('active');
    }
  }

  setCurrentDayActive() {
    const today = new Date();
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const currentDay = dayNames[today.getDay()];
    
    // Set active tab
    const currentTab = document.querySelector(`[data-day="${currentDay}"]`);
    if (currentTab) {
      currentTab.classList.add('active');
    }
    
    // Show current day programs
    this.showProgramsDay(currentDay);
  }

  showNoProgramsMessage() {
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    days.forEach(day => {
      const container = document.querySelector(`#${day}-programs .programs-timeline`);
      if (container) {
        container.innerHTML = '<p>No hay programas disponibles</p>';
      }
    });
  }

  showProgramsError() {
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    days.forEach(day => {
      const container = document.querySelector(`#${day}-programs .programs-timeline`);
      if (container) {
        container.innerHTML = '<p>Error cargando programas</p>';
      }
    });
  }

  async loadNews() {
    try {
      const news = await getNews(1, 8);
      const container = document.getElementById('news-feed');
      
      if (!container) {
        console.error('Template3: News container not found!');
        return;
      }
      
      if (news && news.data && news.data.length > 0) {
        // Store news data for modal
        this.newsData = news.data;
        
        const html = news.data.map((article, index) => `
          <div class="content-card news-card">
            ${article.imageUrl ? `<img src="https://dashboard.ipstream.cl${article.imageUrl}" alt="${article.name}">` : ''}
            <div class="card-content">
              <h3>${article.name}</h3>
              <p>${article.shortText || 'Sin resumen disponible'}</p>
              <div class="card-meta">
                <span class="news-date"><i class="fas fa-calendar"></i> ${new Date(article.createdAt).toLocaleDateString()}</span>
                <button class="read-more-btn" onclick="streamApp.openNewsModal(${index})">
                  <i class="fas fa-book-open"></i>
                  <span>Leer más</span>
                </button>
              </div>
            </div>
          </div>
        `).join('');
        
        container.innerHTML = html;
        
        // Setup news modal functionality
        this.setupNewsModal();
        
      } else {
        container.innerHTML = '<div class="loading-content"><p>No hay noticias disponibles</p></div>';
      }
    } catch (error) {
      console.error('Error loading news:', error);
      document.getElementById('news-feed').innerHTML = '<div class="loading-content"><p>Error cargando noticias</p></div>';
    }
  }

  setupNewsModal() {
    // Modal functionality will be handled by openNewsModal function
  }

  openNewsModal(index) {
    if (!this.newsData || !this.newsData[index]) {
      console.error('News data not found for index:', index);
      return;
    }

    const article = this.newsData[index];
    const modal = document.getElementById('news-modal');
    
    if (!modal) {
      console.error('News modal not found');
      return;
    }

    // Update modal content
    document.getElementById('news-modal-title').textContent = article.name;
    document.getElementById('news-modal-date').innerHTML = `<i class="fas fa-calendar"></i> ${new Date(article.createdAt).toLocaleDateString()}`;
    
    if (article.author) {
      document.getElementById('news-modal-author').innerHTML = `<i class="fas fa-user"></i> ${article.author}`;
      document.getElementById('news-modal-author').style.display = 'block';
    } else {
      document.getElementById('news-modal-author').style.display = 'none';
    }

    if (article.imageUrl) {
      document.getElementById('news-modal-image').src = `https://dashboard.ipstream.cl${article.imageUrl}`;
      document.getElementById('news-modal-image').style.display = 'block';
    } else {
      document.getElementById('news-modal-image').style.display = 'none';
    }

    document.getElementById('news-modal-content').innerHTML = article.longText || article.content || article.shortText || 'Sin contenido disponible';

    // Update meta tags for sharing
    if (window.metaUpdater) {
      window.metaUpdater.updateNewsMetaTags(article);
    }

    // Show modal
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  closeNewsModal() {
    const modal = document.getElementById('news-modal');
    if (modal) {
      modal.classList.remove('active');
      document.body.style.overflow = '';
      
      // Restore original meta tags
      if (window.metaUpdater) {
        window.metaUpdater.restoreOriginalMetaTags();
      }
    }
  }

  openPodcastModal(index) {
    if (!this.podcastsData || !this.podcastsData[index]) {
      console.error('Podcast data not found for index:', index);
      return;
    }

    const podcast = this.podcastsData[index];
    const modal = document.getElementById('podcast-modal');
    
    if (!modal) {
      console.error('Podcast modal not found');
      return;
    }

    // Update modal content
    document.getElementById('podcast-modal-title').textContent = podcast.title;
    document.getElementById('podcast-modal-episode').textContent = `Episodio #${podcast.episodeNumber || 'N/A'}`;
    document.getElementById('podcast-modal-description').textContent = podcast.description || 'Sin descripción disponible';
    
    if (podcast.duration) {
      document.getElementById('podcast-modal-duration').innerHTML = `<i class="fas fa-clock"></i> ${podcast.duration}`;
    }

    if (podcast.imageUrl) {
      document.getElementById('podcast-modal-image').src = `https://dashboard.ipstream.cl${podcast.imageUrl}`;
      document.getElementById('podcast-modal-image').style.display = 'block';
    } else {
      document.getElementById('podcast-modal-image').style.display = 'none';
    }

    // Setup audio player
    const audioPlayer = document.getElementById('podcast-audio');
    if (podcast.audioUrl) {
      audioPlayer.src = `https://dashboard.ipstream.cl${podcast.audioUrl}`;
      audioPlayer.style.display = 'block';
    } else {
      audioPlayer.style.display = 'none';
    }

    // Show modal
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  openVideocastModal(index) {
    if (!this.videocastsData || !this.videocastsData[index]) {
      console.error('Videocast data not found for index:', index);
      return;
    }

    const videocast = this.videocastsData[index];
    const modal = document.getElementById('videocast-modal');
    
    if (!modal) {
      console.error('Videocast modal not found');
      return;
    }

    // Update modal content
    document.getElementById('videocast-modal-title').textContent = videocast.title;
    document.getElementById('videocast-modal-episode').textContent = `Episodio #${videocast.episodeNumber || 'N/A'}`;
    document.getElementById('videocast-modal-description').textContent = videocast.description || 'Sin descripción disponible';
    
    if (videocast.duration) {
      document.getElementById('videocast-modal-duration').innerHTML = `<i class="fas fa-clock"></i> ${videocast.duration}`;
    }

    // Setup video player
    const videoContainer = document.getElementById('videocast-container');
    if (videocast.videoUrl) {
      // Check if it's a YouTube URL
      if (videocast.videoUrl.includes('youtube.com') || videocast.videoUrl.includes('youtu.be')) {
        const videoId = this.extractYouTubeId(videocast.videoUrl);
        videoContainer.innerHTML = `
          <iframe width="100%" height="400" 
                  src="https://www.youtube.com/embed/${videoId}" 
                  frameborder="0" 
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                  allowfullscreen>
          </iframe>
        `;
      } else {
        // For other video URLs, use video element
        videoContainer.innerHTML = `
          <video controls style="width: 100%; height: 400px; border-radius: 8px;">
            <source src="${videocast.videoUrl}" type="video/mp4">
            Tu navegador no soporta el elemento video.
          </video>
        `;
      }
    } else {
      videoContainer.innerHTML = '<p>No hay video disponible</p>';
    }

    // Show modal
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  extractYouTubeId(url) {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  }

  closePodcastModal() {
    const modal = document.getElementById('podcast-modal');
    if (modal) {
      modal.classList.remove('active');
      document.body.style.overflow = '';
      // Pause audio if playing
      const audio = document.getElementById('podcast-audio');
      if (audio) {
        audio.pause();
      }
    }
  }

  closeVideocastModal() {
    const modal = document.getElementById('videocast-modal');
    if (modal) {
      modal.classList.remove('active');
      document.body.style.overflow = '';
      // Clear video container to stop playback
      document.getElementById('videocast-container').innerHTML = '';
    }
  }

  openAnuncioModal(index) {
    if (!this.promotionsData || !this.promotionsData[index]) {
      console.error('Anuncio data not found for index:', index);
      return;
    }

    const anuncio = this.promotionsData[index];
    const modal = document.getElementById('anuncio-modal');
    
    if (!modal) {
      console.error('Anuncio modal not found');
      return;
    }

    // Update modal content
    document.getElementById('anuncio-modal-title').textContent = anuncio.title;
    document.getElementById('anuncio-modal-description').textContent = anuncio.description || 'Sin descripción disponible';
    
    if (anuncio.imageUrl) {
      document.getElementById('anuncio-modal-image').src = `https://dashboard.ipstream.cl${anuncio.imageUrl}`;
      document.getElementById('anuncio-modal-image').style.display = 'block';
    } else {
      document.getElementById('anuncio-modal-image').style.display = 'none';
    }

    // Setup link if available
    const actionsContainer = document.getElementById('anuncio-actions');
    const linkBtn = document.getElementById('anuncio-link');
    
    if (anuncio.link) {
      linkBtn.href = anuncio.link;
      actionsContainer.style.display = 'block';
    } else {
      actionsContainer.style.display = 'none';
    }

    // Show modal
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  closeAnuncioModal() {
    const modal = document.getElementById('anuncio-modal');
    if (modal) {
      modal.classList.remove('active');
      document.body.style.overflow = '';
    }
  }

  setupModalEventListeners() {
    // Close modals when clicking outside
    document.addEventListener('click', (e) => {
      if (e.target.classList.contains('news-modal')) {
        this.closeNewsModal();
      }
      if (e.target.classList.contains('podcast-modal')) {
        this.closePodcastModal();
      }
      if (e.target.classList.contains('videocast-modal')) {
        this.closeVideocastModal();
      }
      if (e.target.classList.contains('anuncio-modal')) {
        this.closeAnuncioModal();
      }
      if (e.target.classList.contains('gallery-lightbox')) {
        this.closeGalleryLightbox();
      }
    });

    // Close modals with Escape key and navigate gallery with arrows
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.closeNewsModal();
        this.closePodcastModal();
        this.closeVideocastModal();
        this.closeAnuncioModal();
        this.closeGalleryLightbox();
      }
      const lightbox = document.getElementById('gallery-lightbox');
      if (lightbox && lightbox.classList.contains('active')) {
        if (e.key === 'ArrowRight') this.nextGalleryImage();
        if (e.key === 'ArrowLeft') this.prevGalleryImage();
      }
    });
  }

  async loadPodcasts() {
    try {
      const podcasts = await getPodcasts(1, 8);
      const container = document.getElementById('podcast-library');
      
      if (podcasts && podcasts.data && podcasts.data.length > 0) {
        // Store podcasts data for modal
        this.podcastsData = podcasts.data;
        
        const html = podcasts.data.map((podcast, index) => `
          <div class="content-card podcast-card">
            <div class="card-image">
              ${podcast.imageUrl ? `<img src="https://dashboard.ipstream.cl${podcast.imageUrl}" alt="${podcast.title}">` : '<div class="default-image"><i class="fas fa-podcast"></i></div>'}
              <div class="play-overlay">
                <button class="play-btn" onclick="streamApp.openPodcastModal(${index})">
                  <i class="fas fa-play"></i>
                </button>
              </div>
            </div>
            <div class="card-content">
              <h3>${podcast.title}</h3>
              <div class="card-meta">
                <span><i class="fas fa-headphones"></i> ${podcast.duration || 'N/A'}</span>
                <span><i class="fas fa-list-ol"></i> Ep. ${podcast.episodeNumber || 'N/A'}</span>
              </div>
              <button class="play-button" onclick="streamApp.openPodcastModal(${index})">
                <i class="fas fa-play"></i>
                <span>Reproducir</span>
              </button>
            </div>
          </div>
        `).join('');
        
        container.innerHTML = html;
      } else {
        container.innerHTML = '<div class="loading-content"><p>No hay podcasts disponibles</p></div>';
      }
    } catch (error) {
      console.error('Error loading podcasts:', error);
      document.getElementById('podcast-library').innerHTML = '<div class="loading-content"><p>Error cargando podcasts</p></div>';
    }
  }

  async loadVideocasts() {
    try {
      const videocasts = await getVideocasts(1, 8);
      const container = document.getElementById('videocast-library');
      
      if (videocasts && videocasts.data && videocasts.data.length > 0) {
        // Store videocasts data for modal
        this.videocastsData = videocasts.data;
        
        const html = videocasts.data.map((videocast, index) => `
          <div class="content-card videocast-card">
            <div class="card-image">
              ${videocast.imageUrl ? `<img src="https://dashboard.ipstream.cl${videocast.imageUrl}" alt="${videocast.title}">` : '<div class="default-image"><i class="fas fa-video"></i></div>'}
              <div class="play-overlay">
                <button class="play-btn" onclick="streamApp.openVideocastModal(${index})">
                  <i class="fas fa-play"></i>
                </button>
              </div>
            </div>
            <div class="card-content">
              <h3>${videocast.title}</h3>
              <div class="card-meta">
                <span><i class="fas fa-video"></i> ${videocast.duration || 'N/A'}</span>
                <span><i class="fas fa-list-ol"></i> Ep. ${videocast.episodeNumber || 'N/A'}</span>
              </div>
              <button class="play-button" onclick="streamApp.openVideocastModal(${index})">
                <i class="fas fa-play"></i>
                <span>Reproducir</span>
              </button>
            </div>
          </div>
        `).join('');
        
        container.innerHTML = html;
      } else {
        container.innerHTML = '<div class="loading-content"><p>No hay videos disponibles</p></div>';
      }
    } catch (error) {
      console.error('Error loading videocasts:', error);
      document.getElementById('videocast-library').innerHTML = '<div class="loading-content"><p>Error cargando videocasts</p></div>';
    }
  }

  async loadSponsors() {
    try {
      const sponsors = await getSponsors();
      const container = document.getElementById('sponsors-showcase');
      
      if (sponsors && sponsors.length > 0) {
        const html = sponsors.map(sponsor => `
          <div class="content-card">
            ${sponsor.logoUrl ? `<img src="https://dashboard.ipstream.cl${sponsor.logoUrl}" alt="${sponsor.name}">` : ''}
            <h3>${sponsor.name}</h3>
            <p>${sponsor.description || 'Sin descripción disponible'}</p>
            ${sponsor.address ? `<p style="font-size: 0.9rem; color: #b3b3b3; margin: 0.5rem 0;"><i class="fas fa-map-marker-alt"></i> ${sponsor.address}</p>` : ''}
            <div class="card-meta">
              ${sponsor.website ? `<a href="${sponsor.website}" target="_blank" class="card-action">Visitar Sitio</a>` : ''}
              <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
                ${sponsor.facebook ? `<a href="${sponsor.facebook}" target="_blank" style="color: #1db954;" title="Facebook"><i class="fab fa-facebook"></i></a>` : ''}
                ${sponsor.instagram ? `<a href="${sponsor.instagram}" target="_blank" style="color: #1db954;" title="Instagram"><i class="fab fa-instagram"></i></a>` : ''}
                ${sponsor.youtube ? `<a href="${sponsor.youtube}" target="_blank" style="color: #1db954;" title="YouTube"><i class="fab fa-youtube"></i></a>` : ''}
                ${sponsor.tiktok ? `<a href="${sponsor.tiktok}" target="_blank" style="color: #1db954;" title="TikTok"><i class="fab fa-tiktok"></i></a>` : ''}
                ${sponsor.x ? `<a href="${sponsor.x}" target="_blank" style="color: #1db954;" title="X (Twitter)"><i class="fab fa-x-twitter"></i></a>` : ''}
                ${sponsor.whatsapp ? `<a href="${sponsor.whatsapp}" target="_blank" style="color: #1db954;" title="WhatsApp"><i class="fab fa-whatsapp"></i></a>` : ''}
              </div>
            </div>
          </div>
        `).join('');
        
        container.innerHTML = html;
      } else {
        container.innerHTML = '<div class="loading-content"><p>No hay colaboradores disponibles</p></div>';
      }
    } catch (error) {
      console.error('Error loading sponsors:', error);
      document.getElementById('sponsors-showcase').innerHTML = '<div class="loading-content"><p>Error cargando colaboradores</p></div>';
    }
  }

  async loadPromotions() {
    try {
      const promotions = await getPromotions();
      const container = document.getElementById('promotions-grid');
      
      if (promotions && promotions.length > 0) {
        // Store promotions data for modal
        this.promotionsData = promotions;
        
        const html = promotions.map((promotion, index) => `
          <div class="content-card anuncio-card">
            <div class="card-image">
              ${promotion.imageUrl ? `<img src="https://dashboard.ipstream.cl${promotion.imageUrl}" alt="${promotion.title}">` : '<div class="default-image"><i class="fas fa-bullhorn"></i></div>'}
              <div class="anuncio-overlay">
                <button class="anuncio-view-btn" onclick="streamApp.openAnuncioModal(${index})">
                  <i class="fas fa-eye"></i>
                </button>
              </div>
            </div>
            <div class="card-content">
              <h3>${promotion.title}</h3>
              <button class="anuncio-button" onclick="streamApp.openAnuncioModal(${index})">
                <i class="fas fa-eye"></i>
                <span>Ver Anuncio</span>
              </button>
            </div>
          </div>
        `).join('');
        
        container.innerHTML = html;
      } else {
        container.innerHTML = '<div class="loading-content"><p>No hay anuncios disponibles</p></div>';
      }
    } catch (error) {
      console.error('Error loading promotions:', error);
      document.getElementById('promotions-grid').innerHTML = '<div class="loading-content"><p>Error cargando anuncios</p></div>';
    }
  }

  async loadSocialNetworks() {
    try {
      const social = await getSocialNetworks();
      
      if (social) {
        const networks = [
          { key: 'facebook', icon: 'fab fa-facebook', url: social.facebook },
          { key: 'instagram', icon: 'fab fa-instagram', url: social.instagram },
          { key: 'youtube', icon: 'fab fa-youtube', url: social.youtube },
          { key: 'tiktok', icon: 'fab fa-tiktok', url: social.tiktok },
          { key: 'x', icon: 'fab fa-x-twitter', url: social.x },
          { key: 'whatsapp', icon: 'fab fa-whatsapp', url: social.whatsapp }
        ];
        
        const html = networks
          .filter(network => network.url)
          .map(network => `
            <a href="${network.url}" target="_blank" class="social-link">
              <i class="${network.icon}"></i>
            </a>
          `).join('');
        
        document.querySelector('.social-links').innerHTML = html;
        
        // Also create social hub content
        const socialHubHtml = networks
          .filter(network => network.url)
          .map(network => `
            <div class="content-card">
              <div style="text-align: center; padding: 2rem;">
                <i class="${network.icon}" style="font-size: 4rem; color: #1db954; margin-bottom: 1rem;"></i>
                <h3>${network.key.charAt(0).toUpperCase() + network.key.slice(1)}</h3>
                <p>Síguenos en ${network.key}</p>
                <a href="${network.url}" target="_blank" class="card-action">Seguir</a>
              </div>
            </div>
          `).join('');
        
        document.getElementById('social-hub').innerHTML = socialHubHtml;
      }
    } catch (error) {
      console.error('Error loading social networks:', error);
    }
  }

  async loadGalleries() {
    try {
      const galleries = await getGalleries();
      const container = document.getElementById('galleries-list');

      if (!container) {
        console.error('Galleries container not found');
        return;
      }

      if (galleries && galleries.length > 0) {
        const html = galleries.map((gallery, gIndex) => {
          const images = Array.isArray(gallery.images)
            ? [...gallery.images].sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
            : [];

          const thumbs = images.map((img, iIndex) => `
            <div class="gallery-thumb" data-gallery="${gIndex}" data-index="${iIndex}">
              <img src="https://dashboard.ipstream.cl${img.imageUrl}" alt="${gallery.title}" loading="lazy">
              <div class="gallery-thumb-overlay">
                <i class="fas fa-search-plus"></i>
              </div>
            </div>
          `).join('');

          return `
            <div class="gallery-item">
              <div class="gallery-header">
                <h2 class="gallery-title">
                  <i class="fas fa-images"></i>
                  ${gallery.title}
                </h2>
                ${gallery.description ? `<p class="gallery-description">${gallery.description}</p>` : ''}
                <span class="gallery-image-count">
                  <i class="fas fa-image"></i> ${images.length} ${images.length === 1 ? 'imagen' : 'imágenes'}
                </span>
              </div>
              <div class="gallery-grid">
                ${thumbs}
              </div>
            </div>
          `;
        }).join('');

        container.innerHTML = html;

        this.galleriesData = galleries;

        container.querySelectorAll('.gallery-thumb').forEach(thumb => {
          thumb.addEventListener('click', () => {
            const gIndex = parseInt(thumb.dataset.gallery, 10);
            const iIndex = parseInt(thumb.dataset.index, 10);
            this.openGalleryLightbox(gIndex, iIndex);
          });
        });
      } else {
        container.innerHTML = `
          <div class="gallery-empty">
            <i class="fas fa-images"></i>
            <p>No hay galerías disponibles</p>
          </div>
        `;
      }
    } catch (error) {
      console.error('Error loading galleries:', error);
      const container = document.getElementById('galleries-list');
      if (container) {
        container.innerHTML = `
          <div class="gallery-empty">
            <i class="fas fa-exclamation-triangle"></i>
            <p>Error cargando galerías</p>
          </div>
        `;
      }
    }
  }

  openGalleryLightbox(galleryIndex, imageIndex) {
    if (!this.galleriesData || !this.galleriesData[galleryIndex]) return;

    const gallery = this.galleriesData[galleryIndex];
    this.currentGalleryImages = [...(gallery.images || [])].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    this.currentGalleryIndex = imageIndex;
    this.currentGalleryTitle = gallery.title;

    this.renderGalleryLightbox();
    const modal = document.getElementById('gallery-lightbox');
    if (modal) {
      modal.classList.add('active');
      document.body.style.overflow = 'hidden';
    }
  }

  renderGalleryLightbox() {
    if (!this.currentGalleryImages || this.currentGalleryImages.length === 0) return;

    const imgEl = document.getElementById('gallery-lightbox-image');
    const counterEl = document.getElementById('gallery-lightbox-counter');
    const prevBtn = document.getElementById('gallery-lightbox-prev');
    const nextBtn = document.getElementById('gallery-lightbox-next');

    const img = this.currentGalleryImages[this.currentGalleryIndex];
    if (imgEl && img) {
      imgEl.src = `https://dashboard.ipstream.cl${img.imageUrl}`;
      imgEl.alt = this.currentGalleryTitle || '';
    }
    if (counterEl) {
      counterEl.textContent = `${this.currentGalleryIndex + 1} / ${this.currentGalleryImages.length}`;
    }

    const total = this.currentGalleryImages.length;
    if (prevBtn) prevBtn.style.display = total > 1 ? 'flex' : 'none';
    if (nextBtn) nextBtn.style.display = total > 1 ? 'flex' : 'none';
  }

  closeGalleryLightbox() {
    const modal = document.getElementById('gallery-lightbox');
    if (modal) {
      modal.classList.remove('active');
      document.body.style.overflow = '';
      const imgEl = document.getElementById('gallery-lightbox-image');
      if (imgEl) imgEl.src = '';
      this.currentGalleryImages = null;
      this.currentGalleryIndex = 0;
      this.currentGalleryTitle = null;
    }
  }

  nextGalleryImage() {
    if (!this.currentGalleryImages || this.currentGalleryImages.length < 2) return;
    this.currentGalleryIndex = (this.currentGalleryIndex + 1) % this.currentGalleryImages.length;
    this.renderGalleryLightbox();
  }

  prevGalleryImage() {
    if (!this.currentGalleryImages || this.currentGalleryImages.length < 2) return;
    this.currentGalleryIndex = (this.currentGalleryIndex - 1 + this.currentGalleryImages.length) % this.currentGalleryImages.length;
    this.renderGalleryLightbox();
  }

  async loadSonicPanelData() {
    try {
      const songData = await getCurrentSong();
      this.currentSongData = songData;
      this.updateNowPlaying(songData);
    } catch (error) {
      console.error('Error loading SonicPanel data:', error);
      this.updateNowPlaying({
        title: 'Radio Stream',
        art: null,
        listeners: 0,
        uniqueListeners: 0,
        bitrate: 'N/A',

        history: []
      });
    }
  }

  updateNowPlaying(songData) {
    // Update main display
    document.getElementById('main-song-title').textContent = songData.title;
    document.getElementById('main-song-artist').textContent = 'Radio Stream';
    document.getElementById('main-listeners').innerHTML = `<i class="fas fa-users"></i> ${songData.listeners} oyentes`;
    document.getElementById('main-bitrate').innerHTML = `<i class="fas fa-signal"></i> ${songData.bitrate} kbps`;
    
    // Update top bar (if exists)
    const listenerCountEl = document.getElementById('listener-count');
    if (listenerCountEl) {
      listenerCountEl.textContent = songData.listeners;
    }
    
    // Update bottom player stats
    const playerListenerCount = document.getElementById('player-listener-count');
    if (playerListenerCount) {
      playerListenerCount.textContent = songData.listeners;
    }
    
    const playerBitrateValue = document.getElementById('player-bitrate-value');
    if (playerBitrateValue) {
      playerBitrateValue.textContent = songData.bitrate || 'N/A';
    }
    
    // Update all artwork displays
    const artworkElements = [
      { img: 'main-artwork', default: document.querySelector('.default-artwork-large') },
      { img: 'sidebar-artwork', default: document.querySelector('.default-mini-artwork') },
      { img: 'player-artwork', default: document.querySelector('.default-player-artwork') }
    ];
    
    artworkElements.forEach(({ img, default: defaultEl }) => {
      const imgEl = document.getElementById(img);
      if (songData.art && imgEl) {
        imgEl.src = songData.art;
        imgEl.style.display = 'block';
        if (defaultEl) defaultEl.style.display = 'none';
      } else {
        if (imgEl) imgEl.style.display = 'none';
        if (defaultEl) defaultEl.style.display = 'flex';
      }
    });
    
    // Update all text displays
    const titleElements = ['sidebar-title', 'player-title'];
    titleElements.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.textContent = songData.title;
    });
    
    const artistElements = ['sidebar-artist', 'player-artist'];
    artistElements.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.textContent = 'Radio Stream';
    });
  }

  startSonicPanelUpdates() {
    // Update every 30 seconds
    this.sonicPanelInterval = setInterval(async () => {
      try {
        const songData = await getCurrentSong();
        
        if (!this.currentSongData || this.currentSongData.title !== songData.title) {
          this.currentSongData = songData;
          this.updateNowPlaying(songData);
        } else {
          // Just update listener count
          document.getElementById('main-listeners').innerHTML = `<i class="fas fa-users"></i> ${songData.listeners} oyentes`;
          const listenerCountEl = document.getElementById('listener-count');
          if (listenerCountEl) {
            listenerCountEl.textContent = songData.listeners;
          }
          const playerListenerCount = document.getElementById('player-listener-count');
          if (playerListenerCount) {
            playerListenerCount.textContent = songData.listeners;
          }
        }
      } catch (error) {
        console.error('Error updating SonicPanel data:', error);
      }
    }, 30000);
  }

  setupNavigation() {
    // Only setup once
    if (this.navigationSetup) {
      return;
    }
    
    // Wait a bit to ensure DOM is ready
    setTimeout(() => {
      // FIRST: Ensure sidebar and overlay start in closed state
      const sidebar = document.getElementById('sidebar');
      const overlay = document.getElementById('sidebar-overlay');
      
      if (sidebar && overlay) {
        sidebar.classList.remove('active');
        overlay.classList.remove('active');
      }
      
      // Navigation menu
      document.querySelectorAll('.menu-item').forEach(item => {
        item.addEventListener('click', async (e) => {
          e.preventDefault();
          const section = item.dataset.section;
          
          // Update active menu item
          document.querySelectorAll('.menu-item').forEach(i => i.classList.remove('active'));
          item.classList.add('active');
          
          // Show view
          this.showView(section);
          
          // Load content for specific section if needed
          await this.loadSectionContent(section);
          
          // Close sidebar on mobile after selecting
          if (window.innerWidth <= 768) {
            this.closeSidebar();
          }
        });
      });
      
      // Mobile navigation toggle
      const navToggle = document.querySelector('.nav-toggle');
      
      if (navToggle && sidebar && overlay) {
        // Store reference to the toggle function
        this.toggleSidebarBound = this.toggleSidebar.bind(this);
        
        // Add listener
        navToggle.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          this.toggleSidebarBound();
        });
        
        // Close sidebar when clicking overlay
        overlay.addEventListener('click', () => {
          this.closeSidebar();
        });
        
        this.navigationSetup = true;
      }
      
      // Close sidebar on window resize if screen becomes large
      window.addEventListener('resize', () => {
        if (window.innerWidth > 768) {
          this.closeSidebar();
        }
      });
    }, 100);
  }
  
  toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    
    if (sidebar && overlay) {
      // Check the actual position to determine state
      const sidebarLeft = window.getComputedStyle(sidebar).left;
      const leftValue = parseInt(sidebarLeft);
      
      // If sidebar is visible (left >= -10px), close it. Otherwise open it.
      if (leftValue >= -10) {
        this.closeSidebar();
      } else {
        this.openSidebar();
      }
    }
  }
  
  openSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    
    if (sidebar && overlay) {
      // Force remove first to ensure clean state
      sidebar.classList.remove('active');
      overlay.classList.remove('active');
      
      // Use setTimeout to ensure CSS transition works
      setTimeout(() => {
        sidebar.classList.add('active');
        overlay.classList.add('active');
        document.body.style.overflow = 'hidden';
      }, 10);
    }
  }
  
  closeSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    
    if (sidebar && overlay) {
      sidebar.classList.remove('active');
      overlay.classList.remove('active');
      document.body.style.overflow = '';
    }
  }

  async loadSectionContent(section) {
    console.log('Template3: Loading content for section:', section);
    
    try {
      switch (section) {
        case 'programs':
          await this.loadPrograms();
          break;
        case 'news':
          await this.loadNews();
          break;
        case 'podcasts':
          await this.loadPodcasts();
          break;
        case 'videocasts':
          await this.loadVideocasts();
          break;
        case 'sponsors':
          await this.loadSponsors();
          break;
        case 'promotions':
          await this.loadPromotions();
          break;
        case 'social':
          await this.loadSocialNetworks();
          break;
        case 'galleries':
          await this.loadGalleries();
          break;
        default:
          console.log('Template3: No specific content loader for:', section);
      }
    } catch (error) {
      console.error('Template3: Error loading section content:', error);
    }
  }

  setupAudioPlayer() {
    // All play buttons
    const playButtons = [
      'main-play-btn',
      'sidebar-play'
    ];
    
    playButtons.forEach(buttonId => {
      const button = document.getElementById(buttonId);
      if (button) {
        button.addEventListener('click', () => {
          if (this.isPlaying) {
            this.stopAudio();
          } else {
            this.playAudio();
          }
        });
      }
    });
    
    // Volume control
    const volumeSlider = document.querySelector('.volume-slider');
    if (volumeSlider) {
      volumeSlider.addEventListener('input', (e) => {
        this.currentVolume = e.target.value;
        if (this.audioPlayer) {
          this.audioPlayer.volume = this.currentVolume / 100;
        }
      });
    }
  }



  showView(viewName) {
    console.log('Template3: Showing view:', viewName);
    
    // Hide all views
    document.querySelectorAll('.content-view').forEach(view => {
      view.classList.remove('active');
    });
    
    // Show selected view
    const targetView = document.getElementById(`${viewName}-view`);
    console.log('Template3: Target view element:', targetView);
    
    if (targetView) {
      targetView.classList.add('active');
      console.log('Template3: View activated:', viewName);
    } else {
      console.error('Template3: View not found:', `${viewName}-view`);
    }
    
    // Update breadcrumb
    const breadcrumb = document.getElementById('breadcrumb-title');
    if (breadcrumb) {
      const titles = {
        'now-playing': 'Ahora Suena',
        'programs': 'Programas',
        'news': 'Noticias',
        'podcasts': 'Podcasts',
        'videocasts': 'Videos',
        'videos': 'Ranking Musical',
        'sponsors': 'Colaboradores',
        'promotions': 'Anuncios',
        'social': 'Redes Sociales',
        'galleries': 'Galerías'
      };
      breadcrumb.textContent = titles[viewName] || 'Radio Stream';
    }
    
    this.currentView = viewName;
  }

  playAudio() {
    if (this.streamUrl) {
      if (!this.audioPlayer) {
        this.audioPlayer = new Audio(this.streamUrl);
        this.audioPlayer.volume = this.currentVolume / 100;
      }
      
      this.audioPlayer.play().then(() => {
        this.isPlaying = true;
        this.updatePlayButtons(true);
      }).catch(error => {
        console.error('Error playing audio:', error);
      });
    }
  }

  stopAudio() {
    if (this.audioPlayer) {
      this.audioPlayer.pause();
      this.isPlaying = false;
      this.updatePlayButtons(false);
    }
  }

  updatePlayButtons(isPlaying) {
    const playButtons = document.querySelectorAll('.play-btn, #sidebar-play');
    playButtons.forEach(btn => {
      const icon = btn.querySelector('i');
      if (icon) {
        icon.className = isPlaying ? 'fas fa-pause' : 'fas fa-play';
      }
    });
  }

  formatWeekDays(days) {
    if (!days || !Array.isArray(days)) return 'No especificado';
    
    const dayNames = {
      monday: 'Lun',
      tuesday: 'Mar',
      wednesday: 'Mié',
      thursday: 'Jue',
      friday: 'Vie',
      saturday: 'Sáb',
      sunday: 'Dom'
    };
    
    return days.map(day => dayNames[day] || day).join(', ');
  }

  viewNews(slug) {
    console.log('View news:', slug);
  }

}

// Initialize stream app
const streamApp = new RadioStreamApp();

// Make streamApp available globally for onclick handlers
window.streamApp = streamApp;

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
  if (streamApp.sonicPanelInterval) {
    clearInterval(streamApp.sonicPanelInterval);
  }

  if (streamApp.audioPlayer) {
    streamApp.audioPlayer.pause();
  }
});