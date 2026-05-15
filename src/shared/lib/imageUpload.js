import { menuImageRepository } from "@/repositories/storage/menuImageRepository";
import { hasStoreScope } from "@/shared/lib/storeScope";

/**
 * 이미지 업로드 유틸리티
 * - 자동 압축 (정사각형 크롭 + 600x600)
 * - Supabase Storage 업로드
 * - URL 반환
 */

const BUCKET_NAME = "menu-images";
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const TARGET_SIZE = 600; // 압축 후 가로/세로 크기
const QUALITY = 0.85; // JPEG 품질 (0~1)
const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

/**
 * 이미지 파일을 정사각형으로 압축
 * @param {File} file - 원본 이미지 파일
 * @returns {Promise<Blob>} - 압축된 Blob
 */
export async function compressImageToSquare(file) {
  return new Promise((resolve, reject) => {
    // 1. FileReader로 이미지 읽기
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("파일 읽기 실패"));
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = () => reject(new Error("이미지 로드 실패"));
      img.onload = () => {
        // 2. Canvas로 정사각형 크롭 + 리사이즈
        const canvas = document.createElement("canvas");
        canvas.width = TARGET_SIZE;
        canvas.height = TARGET_SIZE;
        const ctx = canvas.getContext("2d");

        // 원본의 짧은 변 기준으로 정사각형 크롭
        const minSide = Math.min(img.width, img.height);
        const sx = (img.width - minSide) / 2;
        const sy = (img.height - minSide) / 2;

        // 부드러운 리사이즈
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";
        ctx.drawImage(
          img,
          sx,
          sy,
          minSide,
          minSide, // 소스 (정사각형 영역)
          0,
          0,
          TARGET_SIZE,
          TARGET_SIZE, // 대상
        );

        // 3. Blob으로 변환 (JPEG 압축)
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error("압축 실패"));
              return;
            }
            resolve(blob);
          },
          "image/jpeg",
          QUALITY,
        );
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

/**
 * 메뉴 이미지 업로드
 * @param {File} file - 원본 이미지 파일
 * @param {string} storeId - 매장 ID (경로용)
 * @param {function} onProgress - 진행률 콜백 (0~100)
 * @returns {Promise<{ok: boolean, url?: string, reason?: string}>}
 */
export async function uploadMenuImage(file, storeId, onProgress) {
  try {
    // 1. 파일 검증
    if (!file) return { ok: false, reason: "파일이 없습니다" };
    if (!hasStoreScope(storeId)) {
      return { ok: false, reason: "매장 정보가 없습니다" };
    }
    if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
      return {
        ok: false,
        reason: "JPG, PNG, WebP 이미지만 업로드 가능합니다",
      };
    }
    if (file.size > MAX_FILE_SIZE) {
      return { ok: false, reason: "파일이 너무 큽니다 (최대 5MB)" };
    }

    if (onProgress) onProgress(10);

    // 2. 이미지 압축
    const compressed = await compressImageToSquare(file);
    if (onProgress) onProgress(40);

    // 3. 파일 경로 생성 (매장별 분리)
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    const filePath = `${storeId}/${timestamp}-${random}.jpg`;

    if (onProgress) onProgress(60);

    // 4. Supabase Storage 업로드
    try {
      await menuImageRepository.uploadMenuImageObject({
        filePath,
        file: compressed,
        contentType: "image/jpeg",
      });
    } catch (error) {
      console.error("업로드 실패:", error);
      return { ok: false, reason: error.message };
    }

    if (onProgress) onProgress(90);

    // 5. Public URL 가져오기
    const publicUrl = menuImageRepository.getMenuImagePublicUrl(filePath);

    if (onProgress) onProgress(100);

    return { ok: true, url: publicUrl, path: filePath };
  } catch (err) {
    console.error("이미지 업로드 에러:", err);
    return { ok: false, reason: err.message };
  }
}

/**
 * 메뉴 이미지 삭제 (Storage에서)
 * @param {string} imageUrl - 삭제할 이미지 URL
 * @returns {Promise<{ok: boolean}>}
 */
export async function deleteMenuImage(imageUrl, storeId) {
  try {
    if (!imageUrl) return { ok: true };
    if (!hasStoreScope(storeId)) {
      return { ok: false, reason: "매장 정보가 없습니다" };
    }

    // URL에서 path 추출
    // 예: 공개 Storage URL의 menu-images/store-id/123-abc.jpg 경로
    // → store-id/123-abc.jpg
    const urlParts = imageUrl.split(`/${BUCKET_NAME}/`);
    if (urlParts.length < 2) {
      return { ok: false, reason: "URL 형식이 잘못됨" };
    }
    const filePath = urlParts[1];
    if (!filePath.startsWith(`${storeId}/`)) {
      return { ok: false, reason: "다른 매장 이미지 경로는 삭제할 수 없음" };
    }

    try {
      await menuImageRepository.removeMenuImageObject(filePath);
    } catch (error) {
      console.error("이미지 삭제 실패:", error);
      return { ok: false, reason: error.message };
    }

    return { ok: true };
  } catch (err) {
    console.error("이미지 삭제 에러:", err);
    return { ok: false, reason: err.message };
  }
}
