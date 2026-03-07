/**
 * Unit tests for:
 *   src/api/v1/types/edu/student.ts
 *   src/api/v1/types/edu/teacher.ts
 *   src/api/v1/types/file.ts
 *   src/api/v1/types/user.ts
 * Verifies that type-shape objects can be constructed at runtime.
 */
import { describe, it, expect } from "vitest";
import type {
  Student,
  CreateStudentRequest,
  UpdateStudentRequest,
  EduClassSimple,
  StudentRecord,
} from "@/api/v1/types/edu/student";
import type {
  Teacher,
  CreateTeacherRequest,
  UpdateTeacherRequest,
} from "@/api/v1/types/edu/teacher";
import type { FileType } from "@/api/v1/types/file";
import type { UserType } from "@/api/v1/types/user";

// ─── FileType ─────────────────────────────────────────────────────────────────

describe("FileType", () => {
  it("can be constructed with all required fields", () => {
    const file: FileType = {
      id: 1,
      md5: "abc123",
      type: "image/png",
      url: "https://cdn.example.com/img.png",
      filename: "img.png",
      size: 2048,
      key: "files/img.png",
    };
    expect(file.id).toBe(1);
    expect(file.type).toBe("image/png");
    expect(file.size).toBe(2048);
  });
});

// ─── UserType ─────────────────────────────────────────────────────────────────

describe("UserType", () => {
  it("can be constructed with id, username, nickname", () => {
    const user: UserType = { id: 10, username: "jsmith", nickname: "John" };
    expect(user.id).toBe(10);
    expect(user.username).toBe("jsmith");
    expect(user.nickname).toBe("John");
  });
});

// ─── Student ──────────────────────────────────────────────────────────────────

describe("Student", () => {
  const avatar: FileType = {
    id: 1,
    md5: "md5",
    type: "image/jpeg",
    url: "https://cdn.example.com/avatar.jpg",
    filename: "avatar.jpg",
    size: 1024,
    key: "avatars/1.jpg",
  };

  it("can be constructed with required fields", () => {
    const student: Student = {
      id: 1,
      name: "Alice",
      age: 10,
      grade: "Grade 4",
      class: "Class A",
      avatar,
    };
    expect(student.name).toBe("Alice");
    expect(student.age).toBe(10);
  });

  it("supports optional fields", () => {
    const student: Student = {
      id: 2,
      name: "Bob",
      age: 11,
      grade: "Grade 5",
      class: "Class B",
      avatar,
      student_id: "S001",
      user_id: 42,
      class_id: 7,
    };
    expect(student.student_id).toBe("S001");
    expect(student.user_id).toBe(42);
  });

  it("supports index signature for extra fields", () => {
    const student: Student = {
      id: 3,
      name: "Carol",
      age: 12,
      grade: "Grade 6",
      class: "Class C",
      avatar,
      custom_field: "extra",
    };
    expect(student["custom_field"]).toBe("extra");
  });
});

// ─── CreateStudentRequest ─────────────────────────────────────────────────────

describe("CreateStudentRequest", () => {
  it("requires class_id", () => {
    const req: CreateStudentRequest = { class_id: 1 };
    expect(req.class_id).toBe(1);
  });

  it("supports all optional fields", () => {
    const req: CreateStudentRequest = {
      class_id: 2,
      user_id: 10,
      name: "Alice",
      age: 10,
      grade: "Grade 4",
    };
    expect(req.name).toBe("Alice");
    expect(req.age).toBe(10);
  });
});

// ─── UpdateStudentRequest ─────────────────────────────────────────────────────

describe("UpdateStudentRequest", () => {
  it("all fields are optional", () => {
    const req: UpdateStudentRequest = {};
    expect(req).toBeDefined();
  });

  it("supports id and partial student fields", () => {
    const req: UpdateStudentRequest = { id: 5, name: "Updated Name" };
    expect(req.id).toBe(5);
    expect(req.name).toBe("Updated Name");
  });
});

// ─── EduClassSimple ───────────────────────────────────────────────────────────

describe("EduClassSimple", () => {
  it("requires id and name", () => {
    const cls: EduClassSimple = { id: 1, name: "Class A" };
    expect(cls.id).toBe(1);
    expect(cls.name).toBe("Class A");
  });

  it("supports optional school_id and school", () => {
    const cls: EduClassSimple = {
      id: 2,
      name: "Class B",
      school_id: 10,
      school: { id: 10, name: "Elementary School" },
    };
    expect(cls.school?.name).toBe("Elementary School");
  });
});

// ─── StudentRecord ────────────────────────────────────────────────────────────

describe("StudentRecord", () => {
  it("requires id and eduClass", () => {
    const record: StudentRecord = {
      id: 1,
      eduClass: { id: 3, name: "Class C" },
    };
    expect(record.id).toBe(1);
    expect(record.eduClass.name).toBe("Class C");
  });
});

// ─── Teacher ──────────────────────────────────────────────────────────────────

describe("Teacher", () => {
  it("can be constructed with required fields", () => {
    const teacher: Teacher = {
      id: 1,
      name: "Ms. Smith",
      subject: "Math",
      phone: "123-456-7890",
      avatar: "https://cdn.example.com/avatar.jpg",
    };
    expect(teacher.name).toBe("Ms. Smith");
    expect(teacher.subject).toBe("Math");
  });

  it("supports optional fields", () => {
    const teacher: Teacher = {
      id: 2,
      name: "Mr. Jones",
      subject: "Science",
      phone: "555-1234",
      avatar: "",
      user_id: 50,
      class_id: 3,
      school_id: 1,
    };
    expect(teacher.user_id).toBe(50);
    expect(teacher.school_id).toBe(1);
  });
});

// ─── CreateTeacherRequest ─────────────────────────────────────────────────────

describe("CreateTeacherRequest", () => {
  it("requires user_id, class_id, school_id", () => {
    const req: CreateTeacherRequest = {
      user_id: 10,
      class_id: 2,
      school_id: 1,
    };
    expect(req.user_id).toBe(10);
    expect(req.class_id).toBe(2);
    expect(req.school_id).toBe(1);
  });

  it("supports optional subject", () => {
    const req: CreateTeacherRequest = {
      user_id: 10,
      class_id: 2,
      school_id: 1,
      subject: "History",
    };
    expect(req.subject).toBe("History");
  });
});

// ─── UpdateTeacherRequest ─────────────────────────────────────────────────────

describe("UpdateTeacherRequest", () => {
  it("all fields optional", () => {
    const req: UpdateTeacherRequest = {};
    expect(req).toBeDefined();
  });

  it("supports id and name", () => {
    const req: UpdateTeacherRequest = { id: 3, name: "New Name" };
    expect(req.id).toBe(3);
  });
});
