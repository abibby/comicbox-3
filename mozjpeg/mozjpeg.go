package mozjpeg

/*
// These CGO flags assume you have built and installed mozjpeg to /opt/mozjpeg
// See the README.md for build instructions.
#cgo CFLAGS: -I/opt/mozjpeg/include
#cgo LDFLAGS: /opt/mozjpeg/lib64/libjpeg.so

#include <stdio.h>
#include <stdlib.h>
#include <jpeglib.h>
#include <setjmp.h> // For error handling

// --- Error Handling ---
// libjpeg's default error handler calls exit(), which will crash the Go app.
// We MUST override this to use setjmp/longjmp to return control to Go.

struct go_jpeg_error_mgr {
    struct jpeg_error_mgr pub; // "public" fields
    jmp_buf setjmp_buffer;     // for longjmp
    char* message;             // for storing the error message
};

// Replacement for the default error_exit method
void go_error_exit(j_common_ptr cinfo) {
    // cinfo->err really points to our go_jpeg_error_mgr struct
    struct go_jpeg_error_mgr *my_err = (struct go_jpeg_error_mgr*) cinfo->err;

    // Create a message string
    my_err->message = (char*)malloc(JMSG_LENGTH_MAX);
    (*cinfo->err->format_message) (cinfo, my_err->message);

    // Jump back to the setjmp point in our Go wrapper
    longjmp(my_err->setjmp_buffer, 1);
}

// Replacement for the output_message method (to suppress warnings to stderr)
void go_output_message(j_common_ptr cinfo) {
    // We can just ignore warnings if we want
    // Or we could buffer them in our error struct
}


// --- DECODER ---

// Struct to hold decode result
typedef struct {
    unsigned char *image;
    int width;
    int height;
    int num_components;
    char *error;
} DecodeResult;

// C function to decode a JPEG from a memory buffer
// Returns a struct with a pointer to the raw RGB data, dims, and error
DecodeResult c_decode_jpeg(unsigned char *jpeg_buffer, unsigned long jpeg_size) {
    struct jpeg_decompress_struct cinfo;
    struct go_jpeg_error_mgr jerr;

    DecodeResult res = { NULL, 0, 0, 0, NULL };

    // 1. Setup error handler
    cinfo.err = jpeg_std_error(&jerr.pub);
    jerr.pub.error_exit = go_error_exit;
    jerr.pub.output_message = go_output_message; // Suppress warnings
    jerr.message = NULL;

    // Establish the jump point for error handling
    if (setjmp(jerr.setjmp_buffer)) {
        // If we get here, a libjpeg error has occurred
        res.error = jerr.message;
        jpeg_destroy_decompress(&cinfo);
        return res;
    }

    // 2. Initialize decompressor
    jpeg_create_decompress(&cinfo);

    // 3. Set a memory source
    jpeg_mem_src(&cinfo, jpeg_buffer, jpeg_size);

    // 4. Read header
    jpeg_read_header(&cinfo, TRUE);

    // 5. Start decompress
    // We can force output to RGB here
    // cinfo.out_color_space = JCS_RGB;
    jpeg_start_decompress(&cinfo);

    res.width = cinfo.output_width;
    res.height = cinfo.output_height;
    res.num_components = cinfo.output_components; // 1 (gray) or 3 (RGB)

    // 6. Allocate buffer for the decoded image
    unsigned long data_size = res.width * res.height * res.num_components;
    res.image = (unsigned char*)malloc(data_size);
    if (res.image == NULL) {
        // We must free the message if we set it ourselves
        res.error = (char*)malloc(100);
        snprintf(res.error, 100, "Failed to allocate memory for decoded image");
        jpeg_destroy_decompress(&cinfo);
        return res;
    }

    // 7. Read scanlines
    JSAMPROW row_pointer[1];
    while (cinfo.output_scanline < cinfo.output_height) {
        row_pointer[0] = (JSAMPROW) &res.image[cinfo.output_scanline * res.width * res.num_components];
        jpeg_read_scanlines(&cinfo, row_pointer, 1);
    }

    // 8. Finish decompress
    jpeg_finish_decompress(&cinfo);

    // 9. Destroy decompressor
    jpeg_destroy_decompress(&cinfo);

    if (jerr.message) free(jerr.message); // free error message if one was created but not fatal
    return res;
}


// --- ENCODER ---

// Struct to hold encode result
typedef struct {
    unsigned char *image;
    unsigned long size;
    char *error;
} EncodeResult;

// C function to encode raw pixels into a JPEG memory buffer
EncodeResult c_encode_jpeg(unsigned char *image_buffer, int width, int height, int num_components, int quality) {
    struct jpeg_compress_struct cinfo;
    struct go_jpeg_error_mgr jerr;

    EncodeResult res = { NULL, 0, NULL };
    unsigned char *outbuffer = NULL;
    unsigned long outsize = 0;

    // 1. Setup error handler
    cinfo.err = jpeg_std_error(&jerr.pub);
    jerr.pub.error_exit = go_error_exit;
    jerr.pub.output_message = go_output_message;
    jerr.message = NULL;

    if (setjmp(jerr.setjmp_buffer)) {
        // Error occurred
        res.error = jerr.message;
        jpeg_destroy_compress(&cinfo);
        if (outbuffer) free(outbuffer); // Free mem_dest buffer if it was allocated
        return res;
    }

    // 2. Initialize compressor
    jpeg_create_compress(&cinfo);

    // 3. Set a memory destination
    jpeg_mem_dest(&cinfo, &outbuffer, &outsize);

    // 4. Set parameters
    cinfo.image_width = width;
    cinfo.image_height = height;
    cinfo.input_components = num_components;
    cinfo.in_color_space = (num_components == 3) ? JCS_RGB : JCS_GRAYSCALE;

    jpeg_set_defaults(&cinfo);
    jpeg_set_quality(&cinfo, quality, TRUE);

    // --- MOZJPEG Specifics ---
    // Enable trellis quantization and other optimizations.
    cinfo.optimize_coding = TRUE;
    // You can expose more of these as Go options
    // jpeg_c_set_int_param(&cinfo, JINT_TRELLIS_QUANT, 1);

    // 5. Start compress
    jpeg_start_compress(&cinfo, TRUE);

    // 6. Write scanlines
    JSAMPROW row_pointer[1];
    while (cinfo.next_scanline < cinfo.image_height) {
        row_pointer[0] = (JSAMPROW) &image_buffer[cinfo.next_scanline * width * num_components];
        jpeg_write_scanlines(&cinfo, row_pointer, 1);
    }

    // 7. Finish compress
    jpeg_finish_compress(&cinfo);

    // 8. Set result
    res.image = outbuffer;
    res.size = outsize;

    // 9. Destroy compressor
    jpeg_destroy_compress(&cinfo);

    if (jerr.message) free(jerr.message);
    return res;
}
*/
import "C"

import (
	"errors"
	"fmt"
	"image"
	"image/color"
	"unsafe"
)

// EncodeOptions specifies options for JPEG encoding.
type EncodeOptions struct {
	// Quality is the JPEG quality, 0-100.
	Quality int
}

// DefaultOptions provides sensible defaults for encoding.
var DefaultOptions = &EncodeOptions{
	Quality: 50,
}

// Decode takes a byte slice of JPEG data and returns a standard image.Image.
// It supports decoding Grayscale and RGB JPEGs.
func Decode(jpegData []byte) (image.Image, error) {
	if len(jpegData) == 0 {
		return nil, errors.New("empty jpeg data")
	}

	// Get a pointer to the underlying array of the slice.
	// This is safe because c_decode_jpeg only reads from it.
	cData := (*C.uchar)(unsafe.Pointer(&jpegData[0]))
	cSize := (C.ulong)(len(jpegData))

	// Call the C decoder
	res := C.c_decode_jpeg(cData, cSize)

	// Check for C-level errors
	if res.error != nil {
		errStr := C.GoString(res.error)
		C.free(unsafe.Pointer(res.error)) // Free the C-allocated error string
		return nil, fmt.Errorf("mozjpeg decode error: %s", errStr)
	}

	// Ensure we free the C-allocated image buffer when we're done
	defer C.free(unsafe.Pointer(res.image))

	width := int(res.width)
	height := int(res.height)
	numComponents := int(res.num_components)
	dataSize := width * height * numComponents

	// C.GoBytes copies the data from C memory (res.image) to a new Go byte slice
	pix := C.GoBytes(unsafe.Pointer(res.image), C.int(dataSize))

	// Create the appropriate image.Image type
	if numComponents == 1 {
		// Grayscale
		img := image.NewGray(image.Rect(0, 0, width, height))
		img.Pix = pix
		return img, nil
	} else if numComponents == 3 {
		// RGB. Go's standard lib prefers RGBA. We must convert.
		img := image.NewRGBA(image.Rect(0, 0, width, height))

		// Convert RGB (from pix) to RGBA (in img.Pix)
		j := 0 // index for pix (RGB)
		for i := 0; i < len(img.Pix); i += 4 {
			if j+2 >= len(pix) {
				// Avoid out-of-bounds read if data is corrupt
				break
			}
			img.Pix[i] = pix[j]     // R
			img.Pix[i+1] = pix[j+1] // G
			img.Pix[i+2] = pix[j+2] // B
			img.Pix[i+3] = 255      // A (fully opaque)
			j += 3
		}
		return img, nil
	}

	return nil, fmt.Errorf("unsupported component count from jpeg: %d", numComponents)
}

// Encode takes a standard image.Image and compresses it to JPEG data
// using mozjpeg's encoder.
func Encode(img image.Image, opts *EncodeOptions) ([]byte, error) {
	if opts == nil {
		opts = DefaultOptions
	}

	bounds := img.Bounds()
	width := bounds.Dx()
	height := bounds.Dy()
	if width == 0 || height == 0 {
		return nil, errors.New("cannot encode empty image")
	}

	// We must feed libjpeg raw RGB or Grayscale.
	// We'll convert the source image.Image to one of these.
	var pix []byte
	var numComponents int
	var cBuffer unsafe.Pointer

	switch img := img.(type) {
	case *image.Gray:
		// Already in the right format
		numComponents = 1
		pix = img.Pix
	case *image.RGBA:
		// Convert RGBA to RGB
		numComponents = 3
		pix = make([]byte, width*height*numComponents)
		j := 0
		for i := 0; i < len(img.Pix); i += 4 {
			pix[j] = img.Pix[i]
			pix[j+1] = img.Pix[i+1]
			pix[j+2] = img.Pix[i+2]
			j += 3
		}
	case *image.NRGBA:
		// Convert NRGBA to RGB
		numComponents = 3
		pix = make([]byte, width*height*numComponents)
		j := 0
		for i := 0; i < len(img.Pix); i += 4 {
			pix[j] = img.Pix[i]
			pix[j+1] = img.Pix[i+1]
			pix[j+2] = img.Pix[i+2]
			j += 3
		}
	case *image.YCbCr:
		// Convert YCbCr to RGB
		numComponents = 3
		pix = make([]byte, width*height*numComponents)
		j := 0
		for y := bounds.Min.Y; y < bounds.Max.Y; y++ {
			for x := bounds.Min.X; x < bounds.Max.X; x++ {
				r, g, b := color.YCbCrToRGB(img.Y[img.YOffset(x, y)], img.Cb[img.COffset(x, y)], img.Cr[img.COffset(x, y)])
				pix[j] = r
				pix[j+1] = g
				pix[j+2] = b
				j += 3
			}
		}
	default:
		// Generic conversion for other types (e.g., image.Paletted)
		numComponents = 3
		pix = make([]byte, width*height*numComponents)
		j := 0
		for y := bounds.Min.Y; y < bounds.Max.Y; y++ {
			for x := bounds.Min.X; x < bounds.Max.X; x++ {
				// Use RGBA() and shift to get 8-bit values
				r, g, b, _ := img.At(x, y).RGBA()
				pix[j] = byte(r >> 8)
				pix[j+1] = byte(g >> 8)
				pix[j+2] = byte(b >> 8)
				j += 3
			}
		}
	}

	if len(pix) == 0 {
		return nil, errors.New("failed to get pixel data from image")
	}
	cBuffer = unsafe.Pointer(&pix[0])

	// Call the C encoder
	res := C.c_encode_jpeg(
		(*C.uchar)(cBuffer),
		C.int(width),
		C.int(height),
		C.int(numComponents),
		C.int(opts.Quality),
	)

	// Check for C-level errors
	if res.error != nil {
		errStr := C.GoString(res.error)
		C.free(unsafe.Pointer(res.error))
		return nil, fmt.Errorf("mozjpeg encode error: %s", errStr)
	}

	// Ensure we free the C-allocated image buffer (which contains the JPEG)
	defer C.free(unsafe.Pointer(res.image))

	// Copy the C buffer (the new JPEG) into a Go slice
	jpegData := C.GoBytes(unsafe.Pointer(res.image), C.int(res.size))

	return jpegData, nil
}
