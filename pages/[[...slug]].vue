<script setup lang="ts">
import type { DriveFolderNode, DriveImage } from '~/types/drive';

const route = useRoute();

const slugSegments = computed(() => {
  const value = route.params.slug;
  if (!value) {
    return [];
  }
  return Array.isArray(value) ? value : [value];
});

const slugPath = computed(() => slugSegments.value.filter(Boolean).join('/'));

const { data, pending, error } = await useAsyncData<DriveFolderNode>(
  () => {
    const endpoint = slugPath.value ? `/api/folders/${slugPath.value}` : '/api/folders';
    return $fetch(endpoint);
  },
  {
    watch: [() => route.fullPath],
    server: true,
  },
);

const activeImage = ref<DriveImage | null>(null);

const openModal = (image: DriveImage) => {
  console.log('Opening modal for image:', image.name);
  activeImage.value = image;
};

const closeModal = () => {
  activeImage.value = null;
};

const onKeydown = (event: KeyboardEvent) => {
  if (event.key === 'Escape') {
    closeModal();
  }
};

onMounted(() => {
  window.addEventListener('keydown', onKeydown);
});

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeydown);
});
</script>

<template>
  <section v-if="error" class="empty-state">
    <p>Unable to load this folder. Check your Google Drive credentials and try again.</p>
  </section>

  <section v-else-if="pending && !data" class="empty-state">
    <p>Loading portfolio…</p>
  </section>

  <section v-else-if="data" class="page-section">
    <header class="page-header">
      <nav class="breadcrumbs" aria-label="Breadcrumb">
        <template v-for="(crumb, index) in data.breadcrumbs" :key="crumb.route">
          <NuxtLink :to="crumb.route">{{ crumb.label }}</NuxtLink>
          <span v-if="index < data.breadcrumbs.length - 1">/</span>
        </template>
      </nav>
      <div>
        <h1>{{ data.name }}</h1>
        <p v-if="data.description">
          {{ data.description }}
        </p>
      </div>
    </header>

    <section v-if="data.children.length">
      <p class="section-title">Collections</p>
      <div class="child-grid">
        <NuxtLink
          v-for="child in data.children"
          :key="child.id"
          :to="child.route"
          class="child-card"
        >
          <h3>{{ child.name }}</h3>
          <span>{{ child.images.length }} artworks</span>
        </NuxtLink>
      </div>
    </section>

    <section>
      <p class="section-title">Gallery</p>
      <div v-if="data.images.length" class="gallery-grid">
        <button
          v-for="image in data.images"
          :key="image.id"
          class="gallery-item"
          type="button"
          @click="openModal(image)"
          :aria-label="`Open image ${image.name}`"
        >
          <img :src="image.previewUrl" :alt="image.name" loading="lazy" decoding="async" />
        </button>
      </div>

      <div v-else class="empty-state">
        <p>This folder does not have any images yet.</p>
      </div>
    </section>
  </section>

  <ClientOnly>
    <Teleport to="body">
      <div v-if="activeImage" class="modal-overlay" @click.self="closeModal">
        <div class="modal-content">
          <button class="modal-close" type="button" aria-label="Close image preview" @click="closeModal">
            X
          </button>
          <img :src="activeImage.fullSizeUrl" :alt="activeImage.name" />
        </div>
      </div>
    </Teleport>
  </ClientOnly>
</template>

