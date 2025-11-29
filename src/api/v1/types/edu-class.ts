import { FileType } from "./file";
import { UserType } from "./user";

export interface EduClass {
  id: number;
  name: string;
  created_at: string;
  updated_at: string;
  image?: FileType;
  students?: UserType[];
  techers?: UserType[];
  info: {
    [key: string]: any;
  };
}

/*

  public function fields()
    {
        return ['id', 'name', 'created_at', 'updated_at', 'info'];
    }
    public function extraFields()
    {
        return ['image', 'school', 'eduStudents', 'eduTeachers'];
    }
*/
