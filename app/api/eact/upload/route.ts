// import { handleUpload } from "@vercel/blob/client";
// import { NextResponse } from "next/server";

// export async function POST(request: Request) {
//   try {
//     const body = await request.json();

//     const response = await handleUpload({
//       body,
//       request,

//       onBeforeGenerateToken: async () => {
//         return {
//           allowedContentTypes: [
//             "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
//             "application/vnd.ms-excel",
//           ],
//           maximumSizeInBytes: 200 * 1024 * 1024,
//           addRandomSuffix: true,
//         };
//       },
//     });

//     return NextResponse.json(response);
//   } catch (error) {
//     console.error("Erro no upload do EACT:", error);

//     return NextResponse.json(
//       {
//         error:
//           error instanceof Error
//             ? error.message
//             : "Erro ao preparar upload.",
//       },
//       { status: 500 }
//     );
//   }
// }

// ===============================================
// import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
// import { NextResponse } from "next/server";

// export async function POST(request: Request): Promise<NextResponse> {
//   const body = (await request.json()) as HandleUploadBody;

//   try {
//     const jsonResponse = await handleUpload({
//       body,
//       request,

//       onBeforeGenerateToken: async (pathname) => {
//         return {
//           allowedContentTypes: [
//             "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
//           ],
//           addRandomSuffix: true,
//         };
//       },

//       onUploadCompleted: async ({ blob }) => {
//         console.log("EACT upload completed:", blob.pathname);
//       },
//     });

//     return NextResponse.json(jsonResponse);
//   } catch (error) {
//     console.error("Erro no upload EACT:", error);

//     return NextResponse.json(
//       {
//         error: error instanceof Error ? error.message : String(error),
//       },
//       { status: 400 }
//     );
//   }
// }

import {
  handleUpload,
  type HandleUploadBody,
} from "@vercel/blob/client";

import { NextResponse } from "next/server";

export async function POST(
  request: Request
): Promise<NextResponse> {
  const body = (await request.json()) as HandleUploadBody;

  try {
    const jsonResponse = await handleUpload({
      body,
      request,

      onBeforeGenerateToken: async () => {
        return {
          allowedContentTypes: [
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          ],
          addRandomSuffix: true,
        };
      },
    });

    return NextResponse.json(jsonResponse);
  } catch (error) {
    console.error("Erro no upload EACT:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : String(error),
      },
      { status: 400 }
    );
  }
}