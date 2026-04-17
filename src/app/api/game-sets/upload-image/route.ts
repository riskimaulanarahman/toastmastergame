import { requireAdminApi } from "@/lib/auth/admin";
import { getPublicImageUrl, uploadGameImage } from "@/lib/services/storage-service";
import { handleApiError, HttpError, jsonOk } from "@/lib/utils/http";

export async function POST(request: Request): Promise<Response> {
  try {
    await requireAdminApi();

    const formData = await request.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof File)) {
      throw new HttpError(422, "Missing image file");
    }

    const uploaded = await uploadGameImage(file);

    return jsonOk({
      path: uploaded.path,
      publicUrl: getPublicImageUrl(uploaded.path)
    });
  } catch (error) {
    return handleApiError(error);
  }
}
